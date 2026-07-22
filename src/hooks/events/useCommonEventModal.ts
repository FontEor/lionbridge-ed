/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEventStore } from "@/stores/eventStore";
import { EVENT_ACTION_TYPE, ignoreDirtyField } from "@/utils/constants";
import { useCallback, useEffect } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAlertStore } from "@/stores/store";

export interface useCommonEventModalProps<T extends FieldValues> {
  open: boolean;
  type: (typeof EVENT_ACTION_TYPE)[keyof typeof EVENT_ACTION_TYPE];
  defaultValues?: DefaultValues<T>;
  methods: UseFormReturn<T, any, T>;
  isLookupError: boolean;
}
const useCommonEventModal = <T extends FieldValues>({
  type,
  open,
  defaultValues,
  methods,
  isLookupError,
}: useCommonEventModalProps<T>) => {
  const { t } = useTranslation();
  const alertApi = useAlertStore.useAlert();
  const {
    formState: { dirtyFields },
    subscribe,
    reset,
    trigger,
  } = methods;
  const setIsEventDrawerDirty = useEventStore.useSetIsEventDrawerDirty();
  useEffect(() => {
    const callback = subscribe({
      formState: {
        dirtyFields: true,
      },
      callback: ({ dirtyFields = {} }) => {
        setIsEventDrawerDirty(
          Object.keys(dirtyFields).filter((i) => !ignoreDirtyField.includes(i))
            .length !== 0,
        );
      },
    });
    return () => callback();
  }, [subscribe, setIsEventDrawerDirty, dirtyFields]);

  const alertFetchError = useCallback(() => {
    alertApi.error({
      title: t("label.dataFetchError"),
      message: t("message.unableToLoadRequiredData"),
    });
  }, [alertApi, t]);

  useEffect(() => {
    if (open && isLookupError) {
      setTimeout(alertFetchError, 600);
    }
    if (type === EVENT_ACTION_TYPE.CREATE && open) {
      reset();
    } else if (type !== EVENT_ACTION_TYPE.CREATE && open) {
      // keep form value consistence with grid node data
      (defaultValues as () => Promise<T>)().then((values) => {
        reset(values);
        if (type !== EVENT_ACTION_TYPE.VIEW) {
          trigger();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type, isLookupError]);

  return { alertFetchError };
};
export default useCommonEventModal;
