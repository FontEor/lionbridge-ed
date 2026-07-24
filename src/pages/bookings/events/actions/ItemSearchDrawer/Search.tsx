import { useCallback, useEffect, useMemo, useState } from "react";

import Select from "@/components/Select";
import Button from "@/components/Button";
import SearchInput from "@/components/Search";
import { useTranslation } from "react-i18next";
import Pill from "@/components/Pill";
import type {
  SelectChangeValueType,
  SelectValueType,
} from "@/components/Select/type";
import { useBookingStore } from "@/stores/bookingStore";
import type { GetCatalogItemsParams } from "@/types/booking.types";
import useEventOrderItemModal from "@/hooks/events/useEventOrderItemModal";
import { uomFieldName, sectionFieldName } from "@/utils/itemModalUtils";

export default function Search({
  onSubmit,
  isOpen,
}: {
  onSubmit: (param?: GetCatalogItemsParams) => void;
  isOpen: boolean;
}) {
  const { t } = useTranslation();
  const bookingInfo = useBookingStore.useBookingInfo();
  const [itemName, setItemName] = useState("");
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [selectedUOM, setSelectedUOM] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<number[]>([]);
  const { catalogSectionList, unitOfMeasureList, catalogTypesList } =
    useEventOrderItemModal();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = {
      propertyCode: bookingInfo?.propertyCode,
      itemName,
      sectionCode: selectedSections,
      catalogTypeCode: selectedType,
      pricePointCode: selectedUOM,
    };
    if (bookingInfo?.propertyCode) {
      onSubmit(params);
    }
  };

  const handleClear = useCallback(() => {
    setItemName("");
    setSelectedSections([]);
    setSelectedUOM([]);
    setSelectedType([]);
  }, []);

  const onCheckPill = useCallback(
    (id: number) => {
      let newSelected: number[] = [];
      if (selectedType.includes(id)) {
        newSelected = selectedType.filter((item) => item !== id);
      } else {
        newSelected = [id, ...selectedType];
      }
      setSelectedType(newSelected);
    },
    [selectedType],
  );

  useEffect(() => {
    if (!isOpen) {
      handleClear();
      onSubmit();
    }
  }, [isOpen, handleClear, onSubmit]);

  const pillsRenderer = useMemo(() => {
    return catalogTypesList.map((item) => {
      const { description, catalogTypeLookupSid } = item;
      return (
        <Pill
          key={catalogTypeLookupSid}
          id={`catalogType_${catalogTypeLookupSid}`}
          className="h-8 px-3"
          onChange={() => onCheckPill(catalogTypeLookupSid)}
          checked={selectedType.includes(catalogTypeLookupSid)}
        >
          {description}
        </Pill>
      );
    });
  }, [catalogTypesList, onCheckPill, selectedType]);

  return (
    <form className="mt-4 flex flex-col gap-4 px-6" onSubmit={handleSubmit}>
      <div className="ems-field-wrapper">
        <label className="ems-label">{t("label.itemName")}</label>
        <SearchInput
          size="small"
          id="itemSearchName"
          placeholder={`${t("button.search")}...`}
          value={itemName}
          onChange={(value) => {
            setItemName(value);
          }}
        />
      </div>
      <div className="flex gap-6">
        <div className="ems-field-wrapper w-1/2">
          <label className="ems-label">{t("label.section")}</label>
          <Select
            id="itemSectionSelect"
            placeholder=""
            className="w-full"
            multiple={true}
            search={true}
            size="small"
            filedNames={sectionFieldName}
            searchPlaceholder={`${t("button.search")}...`}
            options={catalogSectionList}
            countable={true}
            value={selectedSections as SelectValueType}
            onChange={(value: SelectChangeValueType = []) =>
              setSelectedSections(value as number[])
            }
          />
        </div>
        <div className="ems-field-wrapper w-1/2">
          <label className="ems-label">{t("label.unitOfMeasure")}</label>
          <Select
            id="itemUMSelect"
            placeholder=""
            className="w-full"
            multiple={true}
            search={true}
            size="small"
            filedNames={uomFieldName}
            searchPlaceholder={`${t("button.search")}...`}
            options={unitOfMeasureList}
            countable={true}
            value={selectedUOM as SelectValueType}
            onChange={(value: SelectChangeValueType = []) =>
              setSelectedUOM(value as number[])
            }
          />
        </div>
      </div>
      <div className="ems-field-wrapper items-stretch">
        <label className="ems-label">{t("label.type")}</label>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">{pillsRenderer}</div>
          <div className="flex items-center">
            <Button
              id="item_search_clear"
              variant="tertiary"
              size="small"
              underline
              onClick={handleClear}
            >
              {t("button.clear")}
            </Button>
            <Button
              id="item_search_submit"
              type="submit"
              variant="secondary"
              size="small"
              className="h-9.5"
            >
              {t("button.search")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
