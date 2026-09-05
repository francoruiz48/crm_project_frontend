import { useCallback, useEffect, useState } from 'react';
import FlowEditor from './FlowEditor';
import { useLoading } from 'src/hooks/useLoading';
import type { FlowEditorState, FlowEditorTransition } from 'src/types/leadFlow';
import { mapFlowStates, mapFlowTransitions } from './leadFlowServices/leadFlowUtils';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getLeadFlow, getLeadFlowStates, getLeadFlowTransitions, saveLeadFlowGraph } from './leadFlowServices/FlowService';
import { usePageTitle } from 'src/hooks/usePageTitle';

interface GraphData {
  id?: string | null,
  name: string;
  description?: string;
  states: FlowEditorState[];
  transitions: FlowEditorTransition[];
}

export const LeadFlowEditor = () => {
  const { id } = useParams();
  const editFlowId = id || undefined;

  const [currentLeadFlowId, setCurrentLeadFlowId] = useState<string | null>(editFlowId || null);

  const [initialData, setInitialData] = useState<GraphData>(
    { name: '', description: '', states: [], transitions: [] }
  );

  // --- CARGA DE DATOS ---
  const fetchFlow = useCallback(async () => {
    if (!editFlowId) return
    try {
      const [flowRes, statesRes, transRes] = await Promise.all([
        getLeadFlow(editFlowId),
        getLeadFlowStates({ lead_flow_id: editFlowId }),
        // detailed: true trae from_state/to_state anidados (con su .id como uuid) -- from_state_id/
        // to_state_id planos siguen siendo el id interno viejo (FK embebida sin migrar) y ya no
        // sirven para conectar la transición al tempId (uuid) del nodo. Ver mapFlowTransitions.
        getLeadFlowTransitions({ lead_flow_id: editFlowId, detailed: true })
      ]);

      const mappedStates = mapFlowStates(statesRes.items ?? []);
      const mappedTransitions = mapFlowTransitions(transRes.items ?? []);

      setInitialData({
        name: flowRes.name,
        description: flowRes.description ?? '',
        states: mappedStates,
        transitions: mappedTransitions
      });
    } catch (error) {
      console.error("Error cargando grafo:", error);
      throw error
    }
  }, [editFlowId])

  usePageTitle(initialData.name && `${initialData.name} | Editor de Flujo`)

  const { loading, fnWithLoading } = useLoading(fetchFlow)

  useEffect(() => {
    fnWithLoading();
  }, [fnWithLoading]);

  // --- GUARDADO ATÓMICO (TRANSACCIONAL) ---
  const handleSave = async (flowName: string, flowDescription: string, states: FlowEditorState[], transitions: FlowEditorTransition[]) => {
    // 1. Mapeo de tempId -> ID negativo, solo para etapas NUEVAS (placeholder temporal que le
    // permite al backend correlacionar las transiciones dentro de este mismo payload). Las
    // etapas existentes viajan con su tempId real (uuid) tal cual -- antes se detectaba
    // "nuevo" por si el tempId tenía un guion, pero un uuid de un estado YA EXISTENTE también
    // tiene guiones, así que esa detección dejó de servir (ver isNew en types/leadFlow.ts).
    let negativeIdCounter = -1;
    const newTempIdToBackendId = new Map<string, number>();

    // 2. Preparar Etapas
    const statesPayload = states.map(s => {
      let backendId: number | string;
      if (s.isNew) {
        backendId = negativeIdCounter--;
        newTempIdToBackendId.set(s.tempId, backendId);
      } else {
        backendId = s.tempId; // el tempId de una etapa existente ya es su uuid real
      }

      return {
        id: backendId,
        name: s.name,
        category: s.category,
        is_initial: s.is_initial,
        order: s.order,
        color: s.color,
        position_x: s.position.x,
        position_y: s.position.y
      };
    });

    // 3. Preparar Transiciones: si la punta es una etapa nueva de este mismo payload, usa su
    // placeholder negativo; si no, es una etapa existente y su tempId ya es el uuid real.
    const resolveEndpoint = (tempId: string | null): number | string | null => {
      if (!tempId) return null;
      return newTempIdToBackendId.get(tempId) ?? tempId;
    };

    const transitionsPayload = transitions.map(t => ({
      from_state_id: resolveEndpoint(t.fromStateId),
      to_state_id: resolveEndpoint(t.toStateId)
    })).filter(
      (t): t is { from_state_id: number | string; to_state_id: number | string } =>
        t.from_state_id !== null && t.to_state_id !== null
    );

    // 4. Construir el Payload Final
    const finalPayload = {
      id: currentLeadFlowId, // null si es nuevo
      name: flowName,
      description: flowDescription ?? null,
      states: statesPayload,
      transitions: transitionsPayload
    };

    try {
      const result = await saveLeadFlowGraph(finalPayload);

      // Si era una creación, actualizamos el ID (uuid) y la URL sin recargar
      if (!currentLeadFlowId) {
        setCurrentLeadFlowId(result.id);
        window.history.replaceState(null, '', `/lead-flow-editor/${result.id}`);
      }
    } catch (error) {
      console.error('Error al guardar el grafo:', error);
      throw error;
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <FlowEditor
      initialFlowName={initialData.name}
      initialFlowDescription={initialData.description}
      initialStates={initialData.states}
      initialTransitions={initialData.transitions}
      onSave={handleSave}
    />
  );
};
