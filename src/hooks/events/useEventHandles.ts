/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEventStore } from "@/stores/eventStore";
import { validateData } from "@/utils/yupHelper";
import type {
  RowValueChangedEvent,
  CellEditingStartedEvent,
  RowEditingStartedEvent,
} from "ag-grid-enterprise";
import type { CustomCellEditorProps } from "ag-grid-react";
import getEventSchema from "@/utils/getEventSchema";
import type { GridEventProps, EventProps } from "@/types/booking.types";
import { useCallback } from "react";
import { updateEventTimeDate } from "@/utils/dateHelpers";
import {
  canEventBeBlocked,
  syncOrderTimeWhenEventChange,
} from "@/utils/eventsGridUtils";
import { useEventTypeQuery } from "@/hooks/useLookups";
import { validateEvent } from "@/utils/validation";

const useEventHandles = () => {
  const setIsDirty = useEventStore.useSetIsDirty();
  const setCurrentEditingRow = useEventStore.useSetCurrentEditingRow();
  const { eventWarningSchema } = getEventSchema();

  const {
    data: { eventTypeMap } = {
      eventTypeMap: undefined,
    },
  } = useEventTypeQuery();

  const onEventTypeValueChanged = useCallback(
    (
      params: CustomCellEditorProps | CellEditingStartedEvent,
      value: string,
    ) => {
      const { api } = params;
      const requestRoomBlockEditor = api.getCellEditorInstances({
        columns: ["requestRoomBlock"],
      });

      if (requestRoomBlockEditor.length) {
        const requestRoomBlockIns: any = requestRoomBlockEditor[0];
        if (!canEventBeBlocked(value)) {
          requestRoomBlockIns.eEditor.setValue(false);
          requestRoomBlockIns.eEditor.setDisabled(true);
        } else if (requestRoomBlockIns.eEditor.disabled) {
          requestRoomBlockIns.eEditor.setDisabled(false);
        }
      }

      const displayNameEditor = api.getCellEditorInstances({
        columns: ["postAsName"],
      });
      if (displayNameEditor.length && eventTypeMap) {
        const displayNameEditorIns: any = displayNameEditor[0];
        if (!displayNameEditorIns.eEditor?.getValue()?.trim()) {
          displayNameEditorIns.eEditor.setValue(eventTypeMap[value]);
        }
      }
    },
    [eventTypeMap],
  );

  const onCellEditingStarted = useCallback(
    (params: CellEditingStartedEvent) => {
      const { api } = params;
      const eventTypeEditors = api.getCellEditorInstances({
        columns: ["eventCode"],
      });
      if (eventTypeEditors.length) {
        const eventTypeEditor: any = eventTypeEditors[0];
        const value = eventTypeEditor.eEditor?.getValue();
        if (!canEventBeBlocked(value)) {
          onEventTypeValueChanged(params, value);
        }
      }
    },
    [onEventTypeValueChanged],
  );

  const onRowEditingStarted = useCallback(
    (params: RowEditingStartedEvent) => {
      setCurrentEditingRow({ ...params.data });
    },
    [setCurrentEditingRow],
  );

  const onRowValueChanged = useCallback(
    async ({
      node,
      api,
    }: {
      node: RowValueChangedEvent["node"] | null;
      api: RowValueChangedEvent["api"];
    }) => {
      if (!node) {
        return;
      }
      node.data.startDateTime = updateEventTimeDate(
        node.data.startDateTime,
        node.data.eventDate,
      );
      node.data.endDateTime = updateEventTimeDate(
        node.data.endDateTime,
        node.data.eventDate,
      );
      node.data.dirty = true;
      const event = syncOrderTimeWhenEventChange(
        useEventStore.getState().currentEditingRow as EventProps,
        node.data,
      );
      const validatedEvent = await validateEvent(event);
      api.applyTransaction({ update: [validatedEvent] });
      setTimeout(() => setIsDirty(true), 100);
      setCurrentEditingRow(null);
    },
    [setIsDirty, setCurrentEditingRow],
  );

  const enrichEventsWithValidation = async (
    events: GridEventProps[],
  ): Promise<GridEventProps[]> => {
    if (!events) return [];
    const eventsWithValidation = await Promise.all(
      events.map(async (item) => {
        const warnings = await validateData(item, eventWarningSchema)
          .then(() => null)
          .catch((error) => error);
        return { ...item, warnings } as GridEventProps;
      }),
    );
    return eventsWithValidation;
  };

  return {
    onRowValueChanged,
    enrichEventsWithValidation,
    onEventTypeValueChanged,
    onCellEditingStarted,
    onRowEditingStarted,
  };
};

export default useEventHandles;
