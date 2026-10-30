import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type ChecklistItem,
  type ProgresoChecklist,
  type PuertosDetalle,
  type TemperaturaDetalle,
  type SmartDetalle,
  type OrdenServicio,
  TAREAS_PARTE_1,
  TAREAS_PARTE_2,
  obtenerChecklist,
  marcarTarea,
  calcularProgreso,
  parteUnoCompleta,
  parteDosCompleta,
  checklistCompleto,
  obtenerTareasPendientes,
  guardarBorradorLocal,
  obtenerBorradorLocal,
  guardarPuertosDetalle,
  guardarTemperaturaDetalle,
  guardarSmartDetalle,
  obtenerTelemetriaLocal,
  cerrarOrdenServicio,
} from '../services/checklistService';
import type { CicloMeses } from '../utils/mantenimiento';

export interface UseChecklistReturn {
  items: ChecklistItem[];
  itemsParte1: ChecklistItem[];
  itemsParte2: ChecklistItem[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  progreso: ProgresoChecklist;
  progresoParte1: ProgresoChecklist;
  progresoParte2: ProgresoChecklist;
  parte1Completa: boolean;
  parte2Completa: boolean;
  isChecklistCompleto: boolean;
  tareasPendientes: ChecklistItem[];
  puertosData: PuertosDetalle;
  temperaturaData: TemperaturaDetalle | null;
  smartData: SmartDetalle | null;
  guardandoMap: Record<string, boolean>;
  errorMap: Record<string, boolean>;
  toggleTarea: (idItem: string) => Promise<void>;
  guardarAvance: () => Promise<void>;
  guardarPuertos: (detalle: PuertosDetalle) => Promise<void>;
  guardarTemperatura: (detalle: TemperaturaDetalle) => Promise<void>;
  guardarSmart: (detalle: SmartDetalle) => Promise<void>;
  cerrarOrden: (params: {
    cicloMeses?: CicloMeses;
    diagnostico?: string;
    causaRaiz?: string;
    subsistemaAtendido?: string;
    tipoIntervencion?: 'preventiva' | 'correctiva';
  }) => Promise<OrdenServicio>;
  recargar: () => Promise<void>;
}

export function useChecklist(idOrden: string): UseChecklistReturn {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoMap, setGuardandoMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Estados de telemetría de Sprint 6
  const [puertosData, setPuertosData] = useState<PuertosDetalle>(() => {
    return (
      obtenerTelemetriaLocal<PuertosDetalle>(idOrden, 'puertos') || {
        usb_a: 'ok',
        usb_c: 'ok',
        hdmi: 'ok',
        audio: 'ok',
        rj45: 'ok',
        observaciones: '',
      }
    );
  });

  const [temperaturaData, setTemperaturaData] = useState<TemperaturaDetalle | null>(() => {
    return obtenerTelemetriaLocal<TemperaturaDetalle>(idOrden, 'temperatura');
  });

  const [smartData, setSmartData] = useState<SmartDetalle | null>(() => {
    return obtenerTelemetriaLocal<SmartDetalle>(idOrden, 'smart');
  });

  // Detección de conectividad del dispositivo
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

    const borrador = obtenerBorradorLocal(idOrden);
    if (borrador && borrador.length > 0) {
      setItems(borrador);
    }

    try {
      const data = await obtenerChecklist(idOrden);
      setItems(data);
    } catch {
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

  // Actualización optimista de tareas con rollback
  const toggleTarea = useCallback(
    async (idItem: string) => {
      const itemActual = items.find((it) => it.id_item === idItem);
      if (!itemActual) return;

      const valorAnterior = itemActual.completado;
      const nuevoValor = !valorAnterior;

      const itemsOptimizados = items.map((it) =>
        it.id_item === idItem ? { ...it, completado: nuevoValor } : it
      );
      setItems(itemsOptimizados);
      guardarBorradorLocal(idOrden, itemsOptimizados);

      setGuardandoMap((prev) => ({ ...prev, [idItem]: true }));
      setErrorMap((prev) => ({ ...prev, [idItem]: false }));
      setError(null);

      try {
        const itemActualizado = await marcarTarea(idItem, nuevoValor);
        setItems((prev) =>
          prev.map((it) => (it.id_item === idItem ? itemActualizado : it))
        );
      } catch {
        setItems((prev) =>
          prev.map((it) =>
            it.id_item === idItem ? { ...it, completado: valorAnterior } : it
          )
        );
        guardarBorradorLocal(
          idOrden,
          items.map((it) =>
            it.id_item === idItem ? { ...it, completado: valorAnterior } : it
          )
        );
        setErrorMap((prev) => ({ ...prev, [idItem]: true }));
        setError('No se pudo guardar el cambio. Se restauró el estado anterior.');
      } finally {
        setGuardandoMap((prev) => ({ ...prev, [idItem]: false }));
      }
    },
    [idOrden, items]
  );

  // Guardar avance explícito
  const guardarAvance = useCallback(async () => {
    guardarBorradorLocal(idOrden, items);
  }, [idOrden, items]);

  // Guardar inspección de puertos (Sprint 6 Tarea 1)
  const guardarPuertos = useCallback(
    async (detalle: PuertosDetalle) => {
      setPuertosData(detalle);
      await guardarPuertosDetalle(idOrden, detalle);
      // Auto-marcar tarea de puertos como completada si aún no lo estaba
      const itemPuertos = items.find((i) => i.tarea === 'puertos');
      if (itemPuertos && !itemPuertos.completado) {
        await toggleTarea(itemPuertos.id_item);
      }
    },
    [idOrden, items, toggleTarea]
  );

  // Guardar medición de temperatura (Sprint 6 Tarea 2)
  const guardarTemperatura = useCallback(
    async (detalle: TemperaturaDetalle) => {
      setTemperaturaData(detalle);
      await guardarTemperaturaDetalle(idOrden, detalle);
      const itemTemp = items.find((i) => i.tarea === 'temperatura');
      if (itemTemp && !itemTemp.completado) {
        await toggleTarea(itemTemp.id_item);
      }
    },
    [idOrden, items, toggleTarea]
  );

  // Guardar diagnóstico SMART (Sprint 6 Tarea 3)
  const guardarSmart = useCallback(
    async (detalle: SmartDetalle) => {
      setSmartData(detalle);
      await guardarSmartDetalle(idOrden, detalle);
      const itemSmart = items.find((i) => i.tarea === 'smart');
      if (itemSmart && !itemSmart.completado) {
        await toggleTarea(itemSmart.id_item);
      }
    },
    [idOrden, items, toggleTarea]
  );

  // Cerrar orden de servicio (Sprint 6 Tarea 4 / HU4/HU5 / TC06)
  const cerrarOrden = useCallback(
    async (params: {
      cicloMeses?: CicloMeses;
      diagnostico?: string;
      causaRaiz?: string;
      subsistemaAtendido?: string;
      tipoIntervencion?: 'preventiva' | 'correctiva';
    }) => {
      return await cerrarOrdenServicio(idOrden, {
        items,
        ...params,
      });
    },
    [idOrden, items]
  );

  // Métricas calculadas
  const itemsParte1 = useMemo(
    () => items.filter((it) => TAREAS_PARTE_1.includes(it.tarea)),
    [items]
  );
  const itemsParte2 = useMemo(
    () => items.filter((it) => TAREAS_PARTE_2.includes(it.tarea)),
    [items]
  );

  const progreso = useMemo(() => calcularProgreso(items, 'todos'), [items]);
  const progresoParte1 = useMemo(() => calcularProgreso(items, 'parte1'), [items]);
  const progresoParte2 = useMemo(() => calcularProgreso(items, 'parte2'), [items]);

  const parte1Completa = useMemo(() => parteUnoCompleta(items), [items]);
  const parte2Completa = useMemo(() => parteDosCompleta(items), [items]);
  const isChecklistCompleto = useMemo(() => checklistCompleto(items), [items]);
  const tareasPendientes = useMemo(() => obtenerTareasPendientes(items), [items]);

  return {
    items,
    itemsParte1,
    itemsParte2,
    loading,
    error,
    isOffline,
    progreso,
    progresoParte1,
    progresoParte2,
    parte1Completa,
    parte2Completa,
    isChecklistCompleto,
    tareasPendientes,
    puertosData,
    temperaturaData,
    smartData,
    guardandoMap,
    errorMap,
    toggleTarea,
    guardarAvance,
    guardarPuertos,
    guardarTemperatura,
    guardarSmart,
    cerrarOrden,
    recargar: cargar,
  };
}
