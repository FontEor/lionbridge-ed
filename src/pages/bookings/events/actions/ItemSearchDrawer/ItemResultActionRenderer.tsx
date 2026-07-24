import { type RefObject, useMemo } from "react";
import type { AgGridReact } from "ag-grid-react";
import { type ICellRendererParams } from "ag-grid-community";
import { debounce } from "lodash-es";

import ButtonIcon from "@/components/ButtonIcon";
import { Plus } from "@/components/Icons";
import type { GridEventProps, TopicProps } from "@/types/booking.types";
import { useEventStore } from "@/stores/eventStore";
import { useEventOrderData } from "@/hooks/useEvents";
import { getAddDefaultLangId } from "@/utils/itemModalUtils";

interface ItemResultActionRendererProps extends ICellRendererParams {
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
}

export default function ItemResultActionRenderer({
  gridRef,
  data,
}: ItemResultActionRendererProps) {
  const setIsEventDrawerDirty = useEventStore.useSetIsEventDrawerDirty();
  const { languages: { list: languageList } = { list: [] } } =
    useEventOrderData();
  const langDefaultId = useMemo(() => {
    return getAddDefaultLangId(languageList);
  }, [languageList]);
  const selectedEventOrders = useEventStore.useSelectedEventOrders();

  const addItemToOrder = debounce(() => {
    let quantityOrdered = null;
    if (Object.keys(selectedEventOrders).length === 1) {
      for (const rowKey in selectedEventOrders) {
        if (selectedEventOrders[rowKey].length === 1) {
          quantityOrdered = selectedEventOrders[rowKey][0].attendanceEstimate;
        }
      }
    }

    gridRef.current?.api.applyTransaction({
      add: [
        {
          ...data,
          display: true,
          displayQuantity: true,
          itemNames: [
            {
              displayDescription: data.displayName,
              languageLookupSid: langDefaultId,
              description: data.itemName,
              comment: "",
            },
          ],
          topicSids: data.topics?.map(
            (topic: TopicProps) => topic.itemTopicLookupSid,
          ),
          id: crypto.randomUUID(),
          catalogTypeLookupSid: data.catalogTypeCode,
          pricePointLookupSid: data.itemPrices?.[0]?.pricePointLookupSid,
          sectionLookupSid: data.sectionCode,
          quantityOrdered: quantityOrdered ?? 0,
          itemPrice: data.itemPrices?.[0]?.standardPrice,
        },
      ],
    });
    setIsEventDrawerDirty(true);
  }, 200);
  return (
    <div className="flex size-full items-center justify-center">
      <ButtonIcon
        className="rounded border border-grayscale-600"
        onClick={addItemToOrder}
      >
        <Plus />
      </ButtonIcon>
    </div>
  );
}
