import { useQuery, useMutation, type UseMutationOptions } from "@tanstack/react-query";
import {
  getEvents,
  saveEvents,
  getCatalogItems,
} from "@/services/bookingService";
import type { CatalogItem, GetCatalogItemsParams } from "@/types/booking.types";
import {
  useEventStatus,
  useEventTypeQuery,
  useFunctionRooms,
  useEventSetupQuery,
  useEventOrderStamp,
  useEventOrderTypes,
  useEventOrderTender,
  useCatalogSections,
  useCatalogUnitOfMeasure,
  useCatalogTypes,
  useItemTopic,
  useLanguageList,
} from "./useLookups";
import type { BookingEventParams, EventProps } from "@/types/booking.types";
import { bookingKey } from "./useBooking";
import { useBookingStore } from "@/stores/bookingStore";
import { useEffect, useMemo, useState } from "react";

export const eventsKey = "events";
export const catalogItemKey = "catalogItem";

export function useEvents(bookingNumber: string | number | undefined) {
  return useQuery({
    queryKey: [bookingKey, eventsKey, String(bookingNumber)],
    queryFn: () => getEvents(bookingNumber!),
    enabled: !!bookingNumber,
  });
}

export function useSaveEvents(
  bookingNumber: string | number | undefined,
  options?: Omit<
    UseMutationOptions<Awaited<ReturnType<typeof saveEvents>>, Error, EventProps[]>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: (events: EventProps[]) => saveEvents(bookingNumber!, events),
    ...options,
  });
}

export function useSearchCatalogItem(queryParams?: GetCatalogItemsParams) {
  const [data, setData] = useState<CatalogItem[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!queryParams) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await getCatalogItems(queryParams);
        setData(res);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [queryParams]);
  return { data, isLoading, error };
}

export function useEventOrderData() {
  const bookingInfo = useBookingStore.useBookingInfo();
  const { data: eventOrderTypes } = useEventOrderTypes();
  const { data: eventOrderStampTypes } = useEventOrderStamp();
  const { data: eventOrderTenderTypes } = useEventOrderTender();
  const { data: catalogSectionTypes } = useCatalogSections(
    bookingInfo?.propertyCode,
  );
  const { data: unitOfMeasureTypes } = useCatalogUnitOfMeasure(
    bookingInfo?.propertyCode,
  );
  const { data: CatalogTypes } = useCatalogTypes();
  const { data: itemTopics } = useItemTopic();
  const { data: languages } = useLanguageList(bookingInfo?.propertyCode);
  const eventOrderData = useMemo(
    () => ({
      eventOrderStampTypes,
      eventOrderTypes,
      eventOrderTenderTypes,
      catalogSectionTypes,
      unitOfMeasureTypes,
      CatalogTypes,
      itemTopics,
      languages,
    }),
    [
      eventOrderStampTypes,
      eventOrderTypes,
      eventOrderTenderTypes,
      catalogSectionTypes,
      unitOfMeasureTypes,
      CatalogTypes,
      itemTopics,
      languages,
    ],
  );
  return eventOrderData;
}

export function useEventsGridData(bookingInfo: BookingEventParams) {
  const { data: eventStatus, isLoading: isStatusLoading } = useEventStatus();
  const { data: functionRooms, isLoading: isFunctionRoomsLoading } =
    useFunctionRooms(bookingInfo.propertyCode);
  const { data: eventTypes, isLoading: isEventTypeLoading } =
    useEventTypeQuery();
  const { data: eventSetups, isLoading: isEventSetupLoading } =
    useEventSetupQuery();
  const {
    data: events = [],
    isLoading: isEventLoading,
    isFetching: isEventsFetching,
  } = useEvents(bookingInfo.bookingNumber);

  return {
    isLoading: [
      isStatusLoading,
      isFunctionRoomsLoading,
      isEventTypeLoading,
      isEventLoading,
      isEventSetupLoading,
      isEventsFetching,
    ].some(Boolean),
    eventStatus,
    functionRooms,
    eventTypes,
    eventSetups,
    events,
  };
}
