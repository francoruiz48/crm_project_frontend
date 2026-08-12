import * as React from 'react';
import CommonButton from 'shared/ui/buttons/CommonButton';
import { Grid, List, Stack, ListItemButton, ListItemIcon, ListItemText, Checkbox, Button, Paper, ButtonGroup, Typography, Box, Fade } from '@mui/material';
import { alpha, lighten, useTheme } from '@mui/material/styles';
import { FieldSectionHeader } from 'shared/ui/forms/FieldSectionHeader';

function not(a: readonly string[], b: readonly string[]) {
  return a.filter((value) => !b.includes(value));
}

function intersection(a: readonly string[], b: readonly string[]) {
  return a.filter((value) => b.includes(value));
}

interface LeadColumnSelectorProps<T> {
  originalList: T[],
  selectedFieldIds: string[],
  handleSelectedFieldIds: (ids: string[], closeModal?: boolean) => void,
  handleClose: () => void,
  showField: keyof T,
  //Si se pasa, cada lista muestra un encabezado de sección (línea divisora + título chico) antes del
  //primer ítem de cada tramo contiguo con el mismo nombre de grupo -- refleja el orden actual de la
  //lista, no fuerza un reordenamiento (ver getFieldSelectorGroupName en leadFieldUtils.ts).
  getGroupName?: (item: T) => string,
}

export default function LeadColumnSelector<T extends { id: string, name: string }>
  ({ originalList, selectedFieldIds, handleSelectedFieldIds, handleClose, showField, getGroupName }: LeadColumnSelectorProps<T>) {

  const [checked, setChecked] = React.useState<string[]>([]);
  const [left, setLeft] = React.useState<string[]>(not(originalList.map(f => f.id), selectedFieldIds) ?? []);
  const [right, setRight] = React.useState<string[]>(intersection(originalList.map(f => f.id), selectedFieldIds));

  const leftChecked = intersection(checked, left);
  const rightChecked = intersection(checked, right);

  const handleToggle = (value: string) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setChecked(newChecked);
  };

  const handleAllRight = () => {
    setRight(right.concat(left));
    setLeft([]);
  };

  const handleAllLeft = () => {
    setLeft(left.concat(right));
    setRight([]);
  };

  const handleCheckedToRight = () => {
    setRight(right.concat(leftChecked));
    setLeft(not(left, leftChecked));
    setChecked(not(checked, leftChecked));
  };

  const handleCheckedToLeft = () => {
    setLeft(left.concat(rightChecked));
    setRight(not(right, rightChecked));
    setChecked(not(checked, rightChecked));
  };

  //Permite identificar el objeto cuando paso de una lista a otra
  const [globalDraggedIndex, setGlobalDraggedIndex] = React.useState<{ idx: number, source: "left" | "right" } | null>(null)



  const originalListLookup = React.useMemo(() => {
    const lookup = new Map<string, T>()
    originalList.forEach((item) => lookup.set(item.id, item))
    return lookup
  }, [originalList])

  const handleSetLeft = React.useCallback((list: string[]) => setLeft(list), [])
  const handleSetRight = React.useCallback((list: string[]) => setRight(list), [])
  const handleSetDrag = React.useCallback((newDrag: { idx: number, source: "left" | "right" } | null) =>
    setGlobalDraggedIndex(newDrag), [])

  return (
    <Stack spacing={2}>
      <Typography variant="h2" >Seleccionar Columnas</Typography>
      <Grid container spacing={2}
        sx={{ justifyContent: 'center', alignItems: 'center', width: "100%" }}
      >
        <Grid size="grow" sx={{ minWidth: "13rem" }}>
          <CustomList title={"Columnas Disponibles"} listLookup={originalListLookup} showField={showField} getGroupName={getGroupName}
            checked={checked} globalDraggedIndex={globalDraggedIndex} handleSetDrag={handleSetDrag} handleToggle={handleToggle} isLeft={true}
            list={left} setter={handleSetLeft} contraryList={right} contrarySetter={handleSetRight} />
        </Grid>
        <Grid>
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleAllRight}
              disabled={left.length === 0}
              aria-label="move all right"
            >
              ≫
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleCheckedToRight}
              disabled={leftChecked.length === 0}
              aria-label="move selected right"
            >
              &gt;
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleCheckedToLeft}
              disabled={rightChecked.length === 0}
              aria-label="move selected left"
            >
              &lt;
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleAllLeft}
              disabled={right.length === 0}
              aria-label="move all left"
            >
              ≪
            </Button>
          </Stack>
        </Grid>
        <Grid size="grow" sx={{ minWidth: "13rem" }}>
          <CustomList title={"Columnas a Mostrar"} listLookup={originalListLookup} showField={showField} getGroupName={getGroupName}
            checked={checked} globalDraggedIndex={globalDraggedIndex} handleSetDrag={handleSetDrag} handleToggle={handleToggle}
            isLeft={false}
            contraryList={left} contrarySetter={handleSetLeft} list={right} setter={handleSetRight} />
        </Grid>

      </Grid>
      <Fade in={(right?.length ?? 0) >= 8} >
        <Typography variant="subtitle2" color="warning" sx={{ fontWeight: 600 }}>
          Advertencia: Muchas columnas pueden ralentizar la carga.
        </Typography>
      </Fade>
      <Stack sx={{ alignItems: "end", width: "100%" }}>
        <ButtonGroup >
          <CommonButton actionType='CLOSE' variant="outlined" onClick={() => handleClose()}>
            Cancelar
          </CommonButton>
          <CommonButton actionType='OPTIONS' variant="contained" onClick={() => handleSelectedFieldIds(right, true)} disabled={right.length === 0}>
            Guardar Cambios
          </CommonButton>
        </ButtonGroup>
      </Stack>
    </Stack>
  );
}

interface props<T> {
  title?: string,
  showField: keyof T,
  listLookup: Map<string, T>
  checked: string[],
  handleToggle: (value: string) => () => void,
  list: string[],
  setter: (id: string[]) => void,
  contraryList: string[],
  contrarySetter: (id: string[]) => void,
  globalDraggedIndex: { idx: number, source: "left" | "right" } | null
  handleSetDrag: (newDrag: {
    idx: number;
    source: "left" | "right";
  } | null) => void,
  isLeft: boolean
  getGroupName?: (item: T) => string,
}


const CustomList = <T extends { id: string }>({ title, listLookup, handleToggle, showField, checked, isLeft, list, setter, contraryList, contrarySetter, globalDraggedIndex, handleSetDrag, getGroupName }: props<T>) => {

  const { palette } = useTheme()

  const [dragOver, setDragOver] = React.useState<number | null>(null)

  const isOriginalList = React.useMemo(() => (isLeft && globalDraggedIndex?.source === "left") ||
    (!isLeft && globalDraggedIndex?.source === "right"), [globalDraggedIndex, isLeft])

  const handleDragStart = (index: number) => {
    handleSetDrag({ idx: index, source: isLeft ? "left" : "right" })
  }
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (index: number, last: boolean = false) => {
    if (globalDraggedIndex == null) return
    const listCopy = [...list]
    let draggedItem

    if (isOriginalList) {
      draggedItem = listCopy[globalDraggedIndex.idx]
      listCopy.splice(globalDraggedIndex.idx, 1)
    } else {
      const contraryListCopy = [...contraryList]
      draggedItem = contraryListCopy[globalDraggedIndex.idx]
      contraryListCopy.splice(globalDraggedIndex.idx, 1)
      contrarySetter(contraryListCopy)
    }
    if (last) {
      listCopy.push(draggedItem)
    } else {
      listCopy.splice(index, 0, draggedItem)
    }
    setter(listCopy)
    setDragOver(null)
    handleSetDrag(null)
  }

  const handleDragEnter = (index: number) => {
    setDragOver(index)
  }

  return (
    <Paper sx={{ backgroundColor: lighten(palette.background.paper, .15), overflow: "hidden" }} >
      {title &&
        <Box sx={{
          backgroundColor: palette.primary.light,
          color: palette.primary.contrastText, p: 1
        }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>}
      <Stack sx={{ height: "25rem" }}>
        <List dense component="div" role="list"
          sx={{ overflow: 'auto', padding: 0, marginTop: ".5rem", }}
        >
          {(() => {
            // Encabezado de sección: se muestra antes del primer ítem de cada tramo contiguo con
            // el mismo grupo, siguiendo el orden ACTUAL de `list` (no se reordena nada acá --
            // ver `getGroupName` en LeadColumnSelectorProps).
            let prevGroupName: string | null = null
            return list.flatMap((value: string, idx) => {
              const labelId = `transfer-list-item-${value}-label`;
              const fieldData = listLookup.get(value)
              const isSelected = globalDraggedIndex?.idx === idx
              if (!fieldData) return []

              const nodes: React.ReactNode[] = []
              if (getGroupName) {
                const groupName = getGroupName(fieldData)
                if (groupName !== prevGroupName) {
                  nodes.push(
                    <FieldSectionHeader key={`__section_${idx}_${groupName}`} name={groupName} first={prevGroupName === null} />
                  )
                  // eslint-disable-next-line react-hooks/immutability
                  prevGroupName = groupName
                }
              }

              nodes.push(
                <ListItemButton
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDrop={() => handleDrop(idx)}
                  key={value}
                  role="listitem"
                  onClick={handleToggle(value)}
                  className='column-list-item'
                  sx={{
                    cursor: globalDraggedIndex !== null ? "grabbing" : "grab",
                    backgroundColor: isSelected ? `${alpha(palette.background.default, .5)}` : "",
                    border: isSelected ? `2px solid ${alpha(palette.contrast.light, .5)}` : "",
                    borderTop: (dragOver === idx && globalDraggedIndex !== null && dragOver < globalDraggedIndex?.idx)
                      ? `4px solid ${alpha(palette.secondary.main, .6)}` : "",
                    borderBottom: (dragOver === idx && globalDraggedIndex !== null && dragOver > globalDraggedIndex?.idx)
                      ? `4px solid ${alpha(palette.secondary.main, .6)}` : "",
                  }}
                >
                  <ListItemIcon sx={{ pointerEvents: "none" }}>
                    <Checkbox
                      checked={checked.includes(value)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={`${fieldData?.[showField]}`} sx={{ pointerEvents: "none" }} />
                </ListItemButton>
              );
              return nodes
            })
          })()}
        </List>
        <Box sx={{ flexGrow: 1 }}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(0, true)}
        />
      </Stack>
    </Paper>
  )
};