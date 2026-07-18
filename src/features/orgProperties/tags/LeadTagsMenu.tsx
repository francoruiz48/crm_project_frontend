import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TagFormMenuWrapper } from './LeadTagForm'
import { DisableConfirmDialog } from 'src/components/ui/feedback/ConfirmationDialog'
import { CommonIconButton } from 'shared/ui/buttons/CommonIconButton'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import { CustomListItem } from 'shared/ui/lists/CustomListItem'
import CommonButton from 'shared/ui/buttons/CommonButton'
import CustomChip from 'shared/ui/details/CustomChip'
import { useListPagination } from 'src/hooks/useListPagination'
import { useLoading } from 'src/hooks/useLoading'
import type { LeadDetailed } from 'src/types/leads'
import type { Paginable } from 'src/types/shared'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { Checkbox, List, ListItemButton, ListItemIcon, Popover, Stack, Typography, ListItemText, ButtonGroup } from '@mui/material'
import LocalOfferIcon from "@mui/icons-material/LocalOffer"
import { deleteTag, getTags } from './LeadTagService'
import type { LeadTag, LeadTagDetailed } from 'src/types/orgProperties'
import { updateLeadTags } from 'src/features/lead/leadService'

export const LeadTags = ({ lead, updateLeadInfo }: { lead: LeadDetailed, updateLeadInfo: (lead: LeadDetailed) => void }) => {

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const openTagMenu = (e: React.MouseEvent<HTMLElement>) => {
        setMenuAnchor(e.currentTarget)
    }
    const closeTagMenu = () => {
        setMenuAnchor(null)
    }
    const [tagList, setTagList] = useState<Paginable<LeadTag> | null>(null)

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(tagList, 8)

    const fetchTags = useCallback((fetchPage: number, pageSize: number) => {
        return getTags({ only_active: true, page: fetchPage, page_size: pageSize })
            .then(setTagList)
            .catch(e => showCommonErrorToast(e))
    }, [])

    const { fnWithLoading: fetchTagsLoad, loading } = useLoading(fetchTags)

    useEffect(() => {
        fetchTagsLoad(fetchPage, pageSize)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPage, pageSize])

    /** Actualiza la entidad lead, con sus nuevos tags */
    const handleLeadTagUpdate = (tags: LeadTag[]) => {
        const leadCopy = { ...lead, tags: tags }
        updateLeadInfo(leadCopy)
    }
    /** Actualiza la lista de tags de la organización */
    const handleTagListUpdate = (modifiedTag: LeadTag) => {
        if (!tagList) return
        const oldTags = [...tagList.items]
        const modTagIdx = oldTags.findIndex(oldTag => oldTag.id === modifiedTag.id)
        if (modTagIdx === -1) return
        oldTags[modTagIdx] = modifiedTag
        setTagList({ ...tagList, items: oldTags })
    }
    /** Actualiza la lista de tags del lead  */
    const handleLeadTagsUpdate = (modifiedTag: LeadTag) => {
        const oldTags = [...lead.tags]
        const modTagIdx = oldTags.findIndex(oldTag => oldTag.id === modifiedTag.id)
        if (modTagIdx === -1) return
        oldTags[modTagIdx] = modifiedTag
        handleLeadTagUpdate(oldTags)
    }
    /** Actualiza las listas según si modifica o crea un tag */
    const handleTagsUpdate = (modifiedTag?: LeadTag) => {
        if (!modifiedTag) return fetchTagsLoad(fetchPage, pageSize)
        handleTagListUpdate(modifiedTag)
        handleLeadTagsUpdate(modifiedTag)
    }
    /** Actualiza las listas cuando se elimina un tag */
    const handleDeleteTag = (deletedTag: LeadTag) => {
        const oldTags = [...lead.tags]
        const newTags = oldTags.filter(oldTag => oldTag.id !== deletedTag.id)
        handleLeadTagUpdate(newTags)
        return fetchTagsLoad(fetchPage, pageSize)
    }
    /** Saca un tag puntual del lead (sin abrir el popover), directo desde la X del chip */
    const handleUnassignTag = (tagToRemove: LeadTag) => {
        const newTagIds = lead.tags.filter(tag => tag.id !== tagToRemove.id).map(tag => tag.id)
        return updateLeadTags(newTagIds, lead.id)
            .then(res => handleLeadTagUpdate(res.tags))
            .catch(e => showCommonErrorToast(e))
    }

    return (<>
        <Stack direction="row" spacing={.5} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "start", width: "100%" }}>
            {lead.tags.length === 0 ? (
                // Antes esto era solo un "+" suelto (sin texto ni ícono de etiqueta), poco
                // claro sobre qué hacía. Ahora deja explícito que es para agregar etiquetas.
                <CustomChip chipColor="primary" size='small' onClick={openTagMenu} label={
                    <Stack direction="row" spacing={.5} sx={{ alignItems: "center" }}>
                        <LocalOfferIcon fontSize='inherit' />
                        <span>Etiquetas</span>
                    </Stack>
                } />
            ) : (
                <>
                    {lead.tags.map(tag =>
                        <CustomChip key={`lead-${tag.id}`} size='small' chipColor={tag.color} defaultColor="secondary"
                            label={tag.name} onDelete={() => handleUnassignTag(tag)} />
                    )}
                    <CommonIconButton title="Agregar etiquetas" actionType="CREATE" color="primary" size="small" onClick={openTagMenu} />
                </>
            )}
        </Stack>
        <LeadTagsMenu leadId={lead.id} tagList={tagList?.items} leadTags={lead.tags} pageComponentProps={pageComponentProps}
            menuAnchor={menuAnchor} handleClose={closeTagMenu} loadingList={loading}
            handleLeadTagUpdate={handleLeadTagUpdate} handleTagsUpdate={handleTagsUpdate} handleDeleteTag={handleDeleteTag} />
    </>)

}

interface TagsMenuProps {
    leadId: number,
    tagList?: LeadTag[],
    leadTags: LeadTag[],
    menuAnchor: null | HTMLElement,
    handleClose: () => void,
    pageComponentProps: {
        totalPages: number;
        page: number;
        handlePage: (_: React.ChangeEvent<unknown, Element>, value: number) => void;
    },
    handleLeadTagUpdate: (tags: LeadTag[]) => void,
    handleTagsUpdate: (modifiedTag?: LeadTag) => void
    handleDeleteTag: (deletedTag: LeadTag) => Promise<unknown>,
    loadingList?: boolean
}
const LeadTagsMenu = ({ leadId, tagList, leadTags, menuAnchor, handleClose, pageComponentProps,
    handleLeadTagUpdate, handleTagsUpdate, handleDeleteTag, loadingList = false }: TagsMenuProps) => {

    const originalSelectedIds = useMemo(() => leadTags.map(tag => tag.id), [leadTags])

    const [selectedIds, setSelectedIds] = useState<number[]>(originalSelectedIds)

    const isListChanged = useMemo(() =>
        JSON.stringify(originalSelectedIds) !== JSON.stringify(selectedIds),
        [originalSelectedIds, selectedIds])

    const handleCheckboxToggle = (id: number) => {
        const idx = selectedIds.findIndex(sel => sel === id)
        const idsCopy = [...selectedIds]
        if (idx === -1) {
            idsCopy.splice(idx, 0, id) //Agrega
        } else {
            idsCopy.splice(idx, 1) //Elimina
        }
        setSelectedIds(idsCopy)
    }

    const onSaveTags = () => {
        return updateLeadTags(selectedIds, leadId)
            .then(res => {
                showToast("Etiquetas del lead actualizadas con éxito")
                handleLeadTagUpdate(res.tags)
                handleClose()
            })
            .catch(e => showCommonErrorToast(e))
    }

    const { fnWithLoading: saveTagsLoad, loading: loadingSave } = useLoading(onSaveTags)

    const [formAnchor, setFormAnchor] = useState<null | HTMLElement>(null);

    const menuRef = useRef(null)

    const [editTag, setEditTag] = useState<null | LeadTag>(null)

    const toggleCreateTag = () => {
        setEditTag(null)
        setFormAnchor(menuRef.current)
    }
    const toggleEditTag = (tag: LeadTag) => {
        setEditTag(tag)
        setFormAnchor(menuRef.current)
    }

    const onDeleteTag = async (tag: LeadTag | null) => {
        if (!tag) return
        return deleteTag(tag.id).then(() => {
            handleDeleteTag(tag).then(() => {
                showToast(`Etiqueta "${tag.name}" eliminada definitivamente`)
            })
        })
    }
    const [deletingTag, setDeletingTag] = useState<LeadTagDetailed | null>(null)

    const handleSetDeletingTag = (tag: LeadTag) => {
        setDeletingTag({ ...tag, active: true } as LeadTagDetailed)
    }

    return (
        <>
            <Popover disableScrollLock disableAutoFocus id="tags-menu" elevation={3}
                anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                <Stack ref={menuRef} spacing={1} useFlexGap sx={{ p: 1 }}>
                    <Typography variant="h4" component="h3" sx={{ pt: 1, px: 1 }}>Asignar Etiquetas</Typography>
                    <LoadingScreenWrapper loading={loadingList} sx={{ width: "15rem", height: "10rem" }}>
                        <List sx={{ maxHeight: "30rem", minWidth: "15rem", maxWidth: "25rem", overflowY: "auto" }} dense >
                            {
                                tagList?.map(tag => (
                                    <CustomListItem key={`list-${tag.id}`} disablePadding
                                        secondaryAction={
                                            <Stack direction="row" sx={{ mr: -1 }}>
                                                <CommonIconButton title="Modificar" actionType='MODIFY'
                                                    size='small' tooltipSize="small" onClick={() => toggleEditTag(tag)} />
                                                <CommonIconButton title="Eliminar" actionType='CLOSE'
                                                    color="error" size='small' tooltipSize="small" onClick={() => handleSetDeletingTag(tag)} />
                                            </Stack>
                                        }
                                    >
                                        <ListItemButton onClick={() => handleCheckboxToggle(tag.id)} sx={{ py: .25 }}>
                                            <ListItemIcon>
                                                <Checkbox checked={selectedIds.includes(tag.id)} disableRipple
                                                    edge="start" sx={{ py: 0 }} onChange={() => handleCheckboxToggle(tag.id)} />
                                            </ListItemIcon>
                                            <ListItemText sx={{ my: 0, mr: 3 }} primary={
                                                <CustomChip chipColor={tag.color} label={tag.name} sx={{ width: "100%" }} />
                                            } />
                                        </ListItemButton>
                                    </CustomListItem>
                                ))
                            }
                        </List >
                        {pageComponentProps.totalPages > 1 &&
                            <PaginationComponent {...pageComponentProps} />
                        }
                    </LoadingScreenWrapper>
                    <ButtonGroup fullWidth>
                        <CommonButton actionType='CREATE' onClick={toggleCreateTag} variant='outlined' fullWidth disabled={loadingSave}>
                            Agregar
                        </CommonButton>
                        {isListChanged &&
                            <CommonButton actionType='SAVE' onClick={saveTagsLoad} variant='contained' fullWidth loading={loadingSave}>
                                Guardar
                            </CommonButton>
                        }
                    </ButtonGroup >
                </Stack >
            </Popover >
            <TagFormMenuWrapper formAnchor={formAnchor} handleClose={() => setFormAnchor(null)} handleTagsUpdate={handleTagsUpdate} existingTag={editTag} />
            <DisableConfirmDialog entity={deletingTag} clearEntity={() => setDeletingTag(null)} idModal='del-tag'
                onConfirm={() => onDeleteTag(deletingTag)} entityTypeName="la etiqueta" onlyDelete />
        </>
    )
}

