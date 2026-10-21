import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type ChecklistItem,
  type ProgresoChecklist,
  obtenerChecklist,
  marcarTarea,
  calcularProgreso,
  parteUnoCompleta,
  guardarBorradorLocal,
  obtenerBorradorLocal,
} from '../services/checklistService';

export interface UseChecklistReturn {
  items: ChecklistItem[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  progreso: ProgresoChecklist;
  parte1Completa: boolean;
  guardandoMap: Record<string, boolean>;
  errorMap: Record<string, boolean>;
  toggleTarea: (idItem: string) => Promise<void>;
  guardarAvance: () => Promise<void>;
  recargar: () => Promise<void>;
}

export function useChecklist(idOrden: string): UseChecklistReturn {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoMap, setGuardandoMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  // Detección de conectividad del dispositivo (online / offline)
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Carga inicial del checklist
  const cargar = useCallback(async () => {
    if (!idOrden) return;
    setLoading(true);
    setError(null);

    // Si estamos offline o para carga inmediata, consultar borrador local
    const borrador = obtenerBorradorLocal(idOrden);
    if (borrador && borrador.length > 0) {
      setItems(borrador);
    }

    try {
      const data = await obtenerChecklist(idOrden);
      setItems(data);
    } catch {
      // Si ya hay ítems de borrador local, avisar de modo offline sin bloquear
      if (borrador && borrador.length > 0) {
        setIsOffline(true);
      } else {
        setError('No fue posible cargar las verificaciones. Por favor intente más tarde.');
      }
    } finally {
      setLoading(false);
    }
  }, [idOrden]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Actualización optimista de tareas con reversión (rollback) en fallo
  const toggleTarea = useCallback(
    async (idItem: string) => {
      const itemActual = items.find((it) => it.id_item === idItem);
      if (!itemActual) return;

      const valorAnterior = itemActual.completado;
      const nuevoValor = !valorAnterior;

      // 1. Actualización optimista inmediata en memoria y borrador
      const itemsOptimizados = items.map((it) =>
        it.id_item === idItem ? { ...it, completado: nuevoValor } : it,
      );
      setItems(itemsOptimizados);
      guardarBorradorLocal(idOrden, itemsOptimizados);

      // 2. Marcar estado "guardando"
      setGuardandoMap((prev) => ({ ...prev, [idItem]: true }));
      setErrorMap((prev) => ({ ...prev, [idItem]: false }));
      setError(null);

      // 3. Persistir en Supabase
      try {
        const itemActualizado = await marcarTarea(idItem, nuevoValor);
        setItems((prev) =>
          prev.map((it) => (it.id_item === idItem ? itemActualizado : it)),
        );
      } catch {
        // 4. Reversión (rollback) al valor anterior en caso de fallo
        setItems((prev) =>
          prev.map((it) =>
            it.id_item === idItem ? { ...it, completado: valorAnterior } : it,
          ),
        );
        guardarBorradorLocal(
          idOrden,
          items.map((it) =>
            it.id_item === idItem ? { ...it, completado: valorAnterior } : it,
          ),
        );
        setErrorMap((prev) => ({ ...prev, [idItem]: true }));
        setError('No se pudo guardar el cambio. Se restauró el estado anterior.');
      } finally {
        setGuardandoMap((prev) => ({ ...prev, [idItem]: false }));
      }
    },
    [idOrden, items],
  );

  // Guardar avance explícito (persiste borrador y notifica)
  const guardarAvance = useCallback(async () => {
    guardarBorradorLocal(idOrden, items);
  }, [idOrden, items]);

  // Métricas calculadas
  const progreso = useMemo(() => calcularProgreso(items), [items]);
  const parte1Completa = useMemo(() => parteUnoCompleta(items), [items]);

  return {
    items,
    loading,
    error,
    isOffline,
    progreso,
    parte1Completa,
    guardandoMap,
    errorMap,
    toggleTarea,
    guardarAvance,
    recargar: cargar,
  };
}
