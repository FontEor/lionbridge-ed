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
import getOrderSchema from "@/utils/getOrderSchema";
import { useEventStore } from "@/stores/eventStore";
import { useEffect, type RefObject } from "react";
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
import { validateEvent } from "@/utils/validation";

export interface useEventOrderModalProps extends Pick<
  useCommonEventModalProps<CreateEditEventOrderParams>,
  "open" | "type" | "defaultValues"
> {
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
  onClose: () => void;
  eventInfo: EventProps;
  eventOrderNumber?: number;
}

const getCreateDefaultValues = (eventInfo: EventProps | undefined) => ({
  mealPeriod: "",
  postAsName: "",
  alternatePostAs: "",
  readerBoardIndicator: false,
  startDateTime: "",
  endDateTime: "",
  attendanceEstimate: eventInfo?.attendance || 0,
  finalDetailedIndicator: false,
  revisedAverageFoodRevenue: 0,
  revisedAverageBeverageRevenue: 0,
  revisedTechnologyRevenue: 0,
  revisedEngineeringRevenue: 0,
  revisedOtherRevenue: 0,
  revisedPrideRevenue: 0,
  revisedRoomRentalRevenue: 0,
  isReadOnly: false,
});

const useEventOrderModal = ({
  gridRef,
  open,
  type,
  onClose,
  defaultValues,
  eventInfo,
}: useEventOrderModalProps) => {
  const schema = getOrderSchema();
  const setIsDirty = useEventStore.useSetIsDirty();
  const bookingInfo = useBookingStore.useBookingInfo();
  const changeNotification = useChangesNotification();

  const onSubmit = async (data: CreateEditEventOrderParams) => {
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
      const new_order = syncItemServeTimeWhenOrderChange(order, {
        ...(data as unknown as EventOrderProps),
        errors: null,
      });
      eventInfo.eventOrders = updateRowInList(
        eventInfo.eventOrders,
        new_order,
        getOrderRowKey,
      );
      const validatedEvent = await validateEvent(eventInfo);
      gridRef.current?.api?.applyTransaction({
        update: [validatedEvent],
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
        ? getCreateDefaultValues(eventInfo)
        : defaultValues,
    disabled: type === EVENT_ACTION_TYPE.VIEW,
  });
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

  const { reset } = methods;
  useEffect(() => {
    if (open && type === EVENT_ACTION_TYPE.CREATE) {
      reset(getCreateDefaultValues(eventInfo));
    }
  }, [open, type, reset]);

  return { methods, onSubmit };
};

export default useEventOrderModal;
