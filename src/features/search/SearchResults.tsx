import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Box, Grid, List, ListItemAvatar, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material'
import type { SearchResults } from 'src/types/shared';
import { GenericContainer } from 'shared/layout/container/GenericContainer';
import { useLoading } from 'src/hooks/useLoading';
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen';
import { generalSearch } from 'src/services/generalService';
import { getSearchCategories } from './GeneralSearchBar';
import { ResponsiveListItem, type ListItemAction } from 'src/components/ui/lists/CustomListItem';
import type { Lead } from 'src/types/leads';
import { UserAvatar } from 'src/components/ui/details/UserAvatar';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
        </div>
    );
}

export const SearchResultsList = () => {

    const [results, setResults] = useState<SearchResults | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()

    const query = useMemo(() => {
        const queryParam = searchParams.get("query")
        return queryParam ? queryParam : null
    }, [searchParams])

    const fetchResults = useCallback(async (query: string) => {
        if (!query) return setResults(null)
        return generalSearch(query)
            .then(setResults)
    }, [])

    const { loading, fnWithLoading: searchLoad } = useLoading(fetchResults)

    useEffect(() => {
        searchLoad(query)
    }, [searchLoad, query])

    const searchCategories = useMemo(() => getSearchCategories(results), [results])

    const totalResults = useMemo(() => {
        if (!results) return 0
        return Object.entries(results).reduce((acc, value) => acc + value[1].length, 0)
    }, [results])

    const [openTab, setOpenTab] = useState<number>(0)

    const resultTab = useMemo(() => {
        const queryParam = searchParams.get("tab")
        return queryParam ? Number(queryParam) : 0
    }, [searchParams])

    useEffect(() => {
        setOpenTab(resultTab)
    }, [resultTab])

    const handleChange = (_: React.SyntheticEvent, idx: number) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set("tab", String(idx))
            return next
        }, { replace: true })
    };

    const getLengthText = (length: number) => {
        if (length === 0) return "Sin resultados"
        if (length === 1) return "1 resultado"
        return `${length} resultados`
    }

    return (
        <GenericContainer maxWidth="lg">
            <Stack spacing={2}>
                <Typography variant="h1">Resultados de la búsqueda: "{query}"</Typography>
                <LoadingScreenWrapper loading={loading}>
                    {totalResults > 0 ?
                        <Box sx={{ width: '100%' }}>
                            {searchCategories.length > 1 &&
                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                    <Tabs value={openTab} onChange={handleChange} aria-label="Resultados por categoría"
                                        variant="scrollable" scrollButtons="auto">
                                        {searchCategories.map((tab, idx) => {
                                            return (<Tab id={`simple-tab-${idx}`} aria-controls={`simple-tabpanel-${idx}`} key={`tab-${tab.id}`}
                                                disabled={tab.items.length === 0}
                                                label={
                                                    <>
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{tab.label}</Typography>
                                                        <Typography variant="body2" sx={{ fontStyle: "italic" }}>{getLengthText(tab.items.length)}</Typography>
                                                    </>
                                                }
                                            />)
                                        })}
                                    </Tabs>
                                </Box>}
                            {searchCategories.map((tab, idx) => {
                                return (
                                    <CustomTabPanel value={openTab} index={idx} key={`content-${tab.id}`}>
                                        <SearchList list={tab.items} listId={tab.id}
                                            getPrimaryText={tab.getPrimaryItemText} getSecondaryText={tab.getSecondaryItemText} getDetailsLink={tab.getRoute} />
                                    </CustomTabPanel>
                                )
                            })
                            }
                        </Box>
                        :
                        <Typography variant="h3" sx={{ textAlign: "center" }}>No se han encontrado resultados para la búsqueda.</Typography>
                    }
                </LoadingScreenWrapper>
            </Stack>
        </GenericContainer>
    )
}

const RESULT_ACTIONS = (lead: Lead): ListItemAction[] => {
    const actions: ListItemAction[] = []
    // Solo se muestra la acción de campaña si el lead tiene una asignada (evita /campaigns/undefined)
    if (lead.campaign?.id) actions.push({
        actionType: "LIST", component: Link, to: `/campaigns/${lead.campaign.id}`,
        label: "Ver Campaña", permission: "campaign:view"
    })
    actions.push({
        actionType: "DETAILS", component: Link, to: `/leads/${lead.id}`,
        label: "Ver Detalle", permission: "lead:view"
    })
    return actions
}

interface SearchListProps {
    list: Lead[],
    listId: string,
    getPrimaryText: (item: Lead) => string,
    getSecondaryText?: (item: Lead) => string | undefined,
    getDetailsLink: (id: string) => string,
}

const SearchList = ({ list, listId, getPrimaryText, getSecondaryText, getDetailsLink }: SearchListProps) => {

    if (list.length === 0) return (
        <Typography variant="h3" sx={{ textAlign: "center" }}>No se han encontrado resultados para la búsqueda.</Typography>
    )

    return (
        <List>
            <Grid container sx={{ alignItems: "stretch" }}>
                {list.map(item =>
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }}
                        key={`${listId}-${item.id}`} sx={{ minWidth: "20rem" }}>
                        <ResponsiveListItem disablePadding actions={RESULT_ACTIONS(item)}
                            component={Link} to={getDetailsLink(item.id)}          >
                            <ListItemAvatar>
                                <UserAvatar name={getPrimaryText(item)} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{getPrimaryText(item)}</Typography>
                                }
                                secondary={getSecondaryText ? getSecondaryText(item) : ""}
                            />
                        </ResponsiveListItem>
                    </Grid>
                )
                }


            </Grid>
        </List >
    )
}