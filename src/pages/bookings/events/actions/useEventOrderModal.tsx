import type {
  CreateEditEventOrderParams,
  EventOrderProps,
  EventProps,
  GridEventProps,
} from "@/types/booking.types";
import type { useCommonEventModalProps } from "./useCommonEventModal";
import useCommonEventModal from "./useCommonEventModal";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useEventOrderSchema from "./useEventOrderSchema";
import { useEventStore } from "@/stores/eventStore";
import { type RefObject } from "react";
import type { AgGridReact } from "ag-grid-react";
import { EVENT_ACTION_TYPE } from "@/utils/constants";
import { useBookingStore } from "@/stores/bookingStore";
import {
  syncItemServeTimeWhenOrderChange,
  updateRowInList,
  getOrderRowKey,
} from "@/utils/eventsGridUtils";
import {
  useEventOrderStamp,
  useEventOrderTender,
  useEventOrderTypes,
  useMealPeriods,
} from "../useLookups";
import { useChangesNotification } from "../useCommon";

export interface useEventOrderModalProps extends Pick<
  useCommonEventModalProps<CreateEditEventOrderParams>,
  "open" | "type" | "defaultValues"
> {
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
  onClose: () => void;
  eventInfo: EventProps;
  eventOrderNumber?: number;
}

const useEventOrderModal = ({
  gridRef,
  open,
  type,
  onClose,
  defaultValues,
  eventInfo,
}: useEventOrderModalProps) => {
  const schema = useEventOrderSchema();
  const setIsDirty = useEventStore.useSetIsDirty();
  const bookingInfo = useBookingStore.useBookingInfo();
  const changeNotification = useChangesNotification();

  const onSubmit = (data: CreateEditEventOrderParams) => {
    data.attendanceGuarantee ??= 0;
    data.attendanceSet ??= 0;
    if (!eventInfo) return;
    eventInfo.dirty = true;
    if (type === EVENT_ACTION_TYPE.CREATE) {
      const newOrder = {
        ...data,
        eventNumber: eventInfo.eventNumber ?? eventInfo.id,
        id: Date.now(),
      } as unknown as EventOrderProps;

      if (!eventInfo.eventOrders || eventInfo.eventOrders.length === 0) {
        eventInfo.eventOrders = [newOrder];
      } else {
        const eventOrders = [...eventInfo.eventOrders, newOrder];
        eventInfo.eventOrders = eventOrders;
      }
      gridRef.current?.api.applyTransaction({
        update: [eventInfo as GridEventProps],
      });
    } else {
      const order = eventInfo.eventOrders.find(
        (order) =>
          order.eventOrderNumber === data.eventOrderNumber ||
          (!order.eventOrderNumber && order.id === data.id),
      )!;
      const new_order = syncItemServeTimeWhenOrderChange(
        order,
        data as unknown as EventOrderProps,
      );
      eventInfo.eventOrders = updateRowInList(
        eventInfo.eventOrders,
        new_order,
        getOrderRowKey,
      );
      gridRef.current?.api?.applyTransaction({
        update: [eventInfo],
      });
    }
    onClose();
    setIsDirty(true);
    changeNotification();
  };
  const methods = useForm<CreateEditEventOrderParams>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    context: { eventDate: eventInfo?.eventDate },
    defaultValues:
      type === EVENT_ACTION_TYPE.CREATE
        ? {
            mealPeriod: "",
            postAsName: "",
            alternatePostAs: "",
            readerBoardIndicator: false,
            startDateTime: "",
            endDateTime: "",
            attendanceEstimate: eventInfo?.attendance,
            finalDetailedIndicator: false,
            revisedAverageFoodRevenue: 0,
            revisedAverageBeverageRevenue: 0,
            revisedTechnologyRevenue: 0,
            revisedEngineeringRevenue: 0,
            revisedOtherRevenue: 0,
            revisedPrideRevenue: 0,
            revisedRoomRentalRevenue: 0,
            isReadOnly: false,
          }
        : defaultValues,
    disabled: type === EVENT_ACTION_TYPE.VIEW,
  });
  const { reset } = methods;
  const { isError: isEventOrderStampError } = useEventOrderStamp();
  const { isError: isEventOrderTenderError } = useEventOrderTender();
  const { isError: isEventOrderTypesError } = useEventOrderTypes();
  const { isError: isMealPeriodsError } = useMealPeriods(
    bookingInfo?.propertyCode,
  );

  useCommonEventModal<CreateEditEventOrderParams>({
    open,
    type,
    methods,
    defaultValues,
    isLookupError:
      isEventOrderStampError ||
      isEventOrderTenderError ||
      isEventOrderTypesError ||
      isMealPeriodsError,
  });

  return { methods, onSubmit, reset };
};

export default useEventOrderModal;
