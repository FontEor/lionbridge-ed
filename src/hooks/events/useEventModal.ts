/* eslint-disable @typescript-eslint/no-explicit-any */
import getEventSchema from "@/utils/getEventSchema";
import { useBookingStore } from "@/stores";
import { useEventStore } from "@/stores/eventStore";
import type {
  CreateEditEventParams,
  EventProps,
  GridEventProps,
} from "@/types/booking.types";
import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  useForm,
  type Resolver,
  type ResolverResult,
  type SubmitHandler,
} from "react-hook-form";
import type { InferType } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { validateData } from "@/utils/yupHelper";
import {
  DAY_END_TIME,
  DAY_START_TIME,
  EVENT_ACTION_TYPE,
  EVENT_TYPE_DEPARTMENT_NOTES,
  REQUIRED_WHEN_BLOCKED,
} from "@/utils/constants";
import {
  useEventSetupQuery,
  useEventStatus,
  useEventTypeQuery,
  useFunctionRooms,
} from "@/hooks/useLookups";
import { useTranslation } from "react-i18next";
import type { AgGridReact } from "ag-grid-react";
import { getAverageCheckLookup } from "@/services";
import { useQueryClient } from "@tanstack/react-query";
import useCommonEventModal, {
  type useCommonEventModalProps,
} from "./useCommonEventModal";
import {
  isDepartmentNotesEvent,
  getEventRowKey,
  syncOrderTimeWhenEventChange,
} from "@/utils/eventsGridUtils";
import { validateEvents } from "@/utils/validation";
import { useAlertStore } from "@/stores/store";
import { useChangesNotification } from "../useCommon";

export interface useEventModalProps extends Pick<
  useCommonEventModalProps<CreateEditEventParams>,
  "open" | "type" | "defaultValues"
> {
  onClose: (event?: EventProps) => void;
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
}
const useEventModal = ({
  type,
  onClose,
  gridRef,
  open,
  defaultValues,
}: useEventModalProps) => {
  const { t } = useTranslation();
  const [warnings, setWarnings] = useState<{ [k: string]: string }>({});
  const updateWarnings = (values: { [k: string]: string }) =>
    setWarnings((warnings) => ({ ...warnings, ...values }));
  const { eventErrorSchema, eventWarningSchema } = getEventSchema();
  const setIsDirty = useEventStore.useSetIsDirty();
  const alertApi = useAlertStore.useAlert();
  const changeNotification = useChangesNotification();
  const warningFields = Object.keys(
    eventWarningSchema.fields,
  ) as (keyof InferType<typeof eventWarningSchema>)[];
  const bookingInfo = useBookingStore.useBookingInfo();

  const resolver: Resolver<CreateEditEventParams> = async (
    values,
    context,
    options,
  ) => {
    const { errors, ...data } = await yupResolver(eventErrorSchema)(
      values as any,
      context,
      options as any,
    );
    const needValidatedWarnings = warningFields.filter(
      (f) =>
        !errors?.[f] &&
        (options.names?.length ? options.names.includes(f) : true),
    );
    if (needValidatedWarnings.length) {
      await validateData(values, eventWarningSchema.pick(needValidatedWarnings))
        .then(() =>
          updateWarnings(
            needValidatedWarnings.reduce(
              (attr, field) => ({ ...attr, [field]: null }),
              {},
            ),
          ),
        )
        .catch((errors) => {
          updateWarnings(errors);
        });
    }
    return { errors, ...data } as ResolverResult<CreateEditEventParams>;
  };
  const methods = useForm<CreateEditEventParams>({
    defaultValues:
      type === EVENT_ACTION_TYPE.CREATE
        ? {
            requestRoomBlock: true,
            eventDate: bookingInfo?.arrivalDate,
            holdFromIndicator: false,
            holdOverIndicator: false,
            alternatePostAs: "",
            readerBoardIndicator: false,
            startDateTime: "",
            endDateTime: "",
            actualRevenue: null,
            currentRevenue: {},
          }
        : defaultValues,
    disabled: type === EVENT_ACTION_TYPE.VIEW,
    resolver: resolver,
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  const { watch, setValue, getValues, trigger } = methods;

  const { isError: isStatusQueryError } = useEventStatus();
  const { isError: isSetupQueryError } = useEventSetupQuery();
  const { isError: isFunctionRoomsQueryError } = useFunctionRooms(
    bookingInfo?.propertyCode,
  );
  const {
    data: { eventTypeMap } = {
      eventTypeMap: undefined,
    },
    isError: isEventTypeQueryError,
  } = useEventTypeQuery();

  const [eventCode] = watch(["eventCode"]);

  const setDefaultTime = useCallback(() => {
    const startDateTime = getValues("startDateTime");
    const endDateTime = getValues("endDateTime");
    const eventCode = getValues("eventCode");
    if (isDepartmentNotesEvent(eventCode) && !startDateTime && !endDateTime) {
      setValue("startDateTime", DAY_START_TIME, { shouldDirty: true });
      setValue("endDateTime", DAY_END_TIME, { shouldDirty: true });
    }
  }, [getValues, setValue]);

  useEffect(() => {
    if (open && type !== EVENT_ACTION_TYPE.VIEW) {
      setTimeout(setDefaultTime, 200);
    }
  }, [open, setDefaultTime, type]);

  const { alertFetchError } = useCommonEventModal<CreateEditEventParams>({
    type,
    open,
    defaultValues,
    methods,
    isLookupError:
      isStatusQueryError ||
      isSetupQueryError ||
      isFunctionRoomsQueryError ||
      isEventTypeQueryError,
  });

  useEffect(() => {
    if (!getValues("postAsName") && eventCode && eventTypeMap) {
      setValue("postAsName", eventTypeMap[eventCode], { shouldDirty: true });
      trigger("postAsName");
    }
  }, [trigger, eventCode, getValues, setValue, eventTypeMap]);

  const onSubmit: SubmitHandler<CreateEditEventParams> = async (data: any) => {
    if (type === EVENT_ACTION_TYPE.CREATE) {
      data.id = Date.now();
      data.dirty = true;
      data.warnings = warnings;
      gridRef.current?.api.applyTransaction({
        add: [data],
      });
    } else {
      const selectedNodes = gridRef.current?.api.getSelectedNodes() ?? [];
      // TODO: support edit and bulk edit
      const nodes = selectedNodes.filter(
        (node) => node.id === getEventRowKey(data),
      );
      if (nodes.length > 0) {
        const events = nodes.map((node) => {
          const new_event = syncOrderTimeWhenEventChange(
            node.data as EventProps,
            data,
          );
          return {
            ...new_event,
            dirty: true,
          };
        }) as Array<EventProps>;
        const validatedEvents = await validateEvents(events);
        gridRef.current?.api.applyTransaction({
          update: validatedEvents,
        });
      }
    }
    changeNotification();
    setIsDirty(true);
    onClose();
  };

  useEffect(() => {
    setDefaultTime();
    if (eventCode === EVENT_TYPE_DEPARTMENT_NOTES) {
      setValue("requestRoomBlock", false);
      trigger(REQUIRED_WHEN_BLOCKED);
    }
  }, [setValue, eventCode, trigger, setDefaultTime]);

  const onSubmitError = () => {
    alertApi.error({
      title: t("label.unableToAddChanges"),
      message: t("message.pleaseCorrectValidationErrors"),
      multiple: true,
    });
  };

  const queryClient = useQueryClient();
  const handleTypeChange = useCallback(
    (eventCode: string) => {
      queryClient
        .fetchQuery({
          queryKey: ["average_check", bookingInfo?.propertyNumber, eventCode],
          queryFn: async () =>
            getAverageCheckLookup(
              bookingInfo?.propertyNumber as number,
              eventCode as string,
            ),
        })
        .then((data) => {
          setValue("forecastAverageFoodRevenue", data.averageFoodRevenue);
          setValue(
            "forecastAverageBeverageRevenue",
            data.averageBeverageRevenue,
          );
        })
        .catch(alertFetchError);
    },
    [bookingInfo?.propertyNumber, queryClient, setValue, alertFetchError],
  );

  return {
    warnings,
    methods,
    onSubmit,
    onSubmitError,
    handleTypeChange,
  };
};
export default useEventModal;
