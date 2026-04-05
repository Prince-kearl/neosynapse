import { useState } from "react";

export type TouchedFields<TField extends string> = Partial<Record<TField, boolean>>;

export function useTouchedFields<TField extends string>() {
  const [touched, setTouched] = useState<TouchedFields<TField>>({});

  const touch = (field: TField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isTouched = (field: TField) => !!touched[field];

  const reset = () => {
    setTouched({});
  };

  return {
    touched,
    touch,
    isTouched,
    reset,
  };
}

export function useTouchedFieldsById<TId extends string, TField extends string>() {
  const [touchedById, setTouchedById] = useState<Partial<Record<TId, TouchedFields<TField>>>>({});

  const touch = (id: TId, field: TField) => {
    setTouchedById((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: true,
      },
    }));
  };

  const getTouched = (id: TId): TouchedFields<TField> => touchedById[id] || {};

  const isTouched = (id: TId, field: TField) => {
    const fields = touchedById[id];
    return !!fields?.[field];
  };

  const resetId = (id: TId) => {
    setTouchedById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const resetAll = () => {
    setTouchedById({});
  };

  return {
    touchedById,
    touch,
    getTouched,
    isTouched,
    resetId,
    resetAll,
  };
}
