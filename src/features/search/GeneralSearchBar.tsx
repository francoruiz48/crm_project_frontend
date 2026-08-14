import { CircularProgress, InputBase, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { SearchResults } from "../../types/shared";
import { useDebounce } from "../../hooks/useDebounce";
import { showCommonErrorToast } from "src/utils/feedback";
import { generalSearch } from "src/services/generalService";
import { getLeadTitleArray } from "../lead/leadUtils";
import type { Lead } from "src/types/leads";
import { UserAvatar } from "src/components/ui/details/UserAvatar";

export const getSearchCategories = (results: SearchResults | null) =>
    [
        {
            label: "Leads", id: "search-bar-leads", "aria-controls": "search-bar-leads", items: results?.leads ?? [],
            getRoute: (id: string) => `/leads/${id}`,
            getPrimaryItemText: (lead: Lead) => getLeadTitleArray(lead).join(" "),
            getSecondaryItemText: (lead: Lead) => lead.campaign?.name
        },
        /* Agregar items si se quieren más entidades
        {
            label: "Espacios de Trabajo", id: "search-bar-workspaces", "aria-controls": "search-bar-workspaces", items: results?.workspaces ?? [],
            getRoute: (id: string) => `/campaigns/?selected=${id}`, getPrimaryItemText: (wsp: Workspace) => wsp.name
        },
        {
            label: "Campañas", id: "search-bar-campaigns", "aria-controls": "search-bar-campaigns", items: results?.campaigns ?? [],
            getRoute: (id: string) => `/campaigns/${id}`, getPrimaryItemText: (cmp: Campaign) => cmp.name
        },
        {
            label: "Nomencladores", id: "search-bar-nomenclators", "aria-controls": "search-bar-nomenclators", items: results?.nomenclators ?? [],
            getRoute: (id: string) => `/nomenclators/?selected=${id}`, getPrimaryItemText: (nom: Nomenclator) => nom.name
        },
        {
            label: "Ítems de Nomenclador", id: "search-bar-nomenclator_items", "aria-controls": "search-bar-nomenclator_items", items: results?.nomenclator_items ?? [],
            getRoute: (id: string) => `/nomenclators/?selected=${id}`, getPrimaryItemText: (item: NomenclatorItem) => item.value
        }
            */
    ]


const Search = styled('div')(({ theme }) => ({
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.contrast.light}`,
    '&:hover': {
        backgroundColor: theme.palette.background.paper,
        border: `2px solid ${theme.palette.primary.main}`,
    },
    width: '100%',
    display: "flex",
    alignItems: "center",
}));


const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    flex: 1,
    width: '100%',
    paddingRight: "1em",
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 0),
        transition: theme.transitions.create('width'),
        width: '100%',
    },
}));

const SearchWrapper = styled('div')(({ theme }) => ({
    position: 'relative',
    marginRight: theme.spacing(2),
    marginLeft: 0,
    [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(3),
        width: 'auto',
    },
    "&:focus-within .search-options-wrap": {
        display: "block"
    }
}));

const SearchOptions = styled('div')(() => ({
    position: 'absolute',
    width: '100%',
    alignItems: "center",
    display: "none"
}));

const MAX_ITEMS = 5 as const

export const HeaderSearchBar = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);

    const { debouncedFunction, loading } = useDebounce(500)

    useEffect(() => {
        if (query.length < 3) return
        debouncedFunction(() => generalSearch(query)
            .then(setResults)
            .catch(e => {
                showCommonErrorToast(e)
                setResults(null)
            })
        )
    }, [query, debouncedFunction])

    const searchCategories = useMemo(() => getSearchCategories(results), [results])

    const lengthText = (length: number) => {
        if (length === 0) return "Sin resultados"
        if (length === 1) return "1 resultado"
        return `${length} resultados`
    }

    const totalResults = useMemo(() => {
        return searchCategories.reduce((acc, value) => acc + (value?.items?.length ?? 0), 0)
    }, [searchCategories])

    const categoriesWithItems = useMemo(() => {
        return searchCategories.reduce((acc, value) => acc + (value?.items?.length > 0 ? 1 : 0), 0)
    }, [searchCategories])

    return (
        <SearchWrapper sx={{ flexGrow: 1 }}>
            <Search className="search-input-wrap">
                <SearchIconWrapper>
                    <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase className="search-input"
                    placeholder="Buscar Leads en el sistema"
                    inputProps={{ 'aria-label': 'search' }}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </Search>
            {query.length >= 3 &&
                <SearchOptions className="search-options-wrap">
                    <Paper>
                        <List dense>
                            {loading &&
                                <ListItem disablePadding >
                                    <ListItemButton>
                                        <ListItemText primary={
                                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                                <CircularProgress size="1.5rem" />
                                                <Typography variant="body1">Cargando...</Typography>
                                            </Stack>
                                        } />
                                    </ListItemButton>
                                </ListItem>
                            }
                            {!loading && totalResults === 0 &&
                                <ListItem disablePadding >
                                    <ListItemButton>
                                        <ListItemText primary="No hay resultados" />
                                    </ListItemButton>
                                </ListItem>
                            }
                            {//Si hay muchas entidades con opciones, muestra un resumen de cada una
                                !loading && categoriesWithItems > 1 &&
                                searchCategories.map((option, idx) => {
                                    if (!option.items || option.items.length === 0) return
                                    return (
                                        <ListItem disablePadding key={option.id}>
                                            <ListItemButton component={Link} to={`/search?query=${query}&tab=${idx}`}>
                                                <ListItemText primary={
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{option.label}</Typography>
                                                }
                                                    secondary={lengthText(option.items?.length)}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    )
                                })
                            }
                            {//Si solo hay una categoría, muestra los primeros X items, y "Ver todos los resultados"
                                !loading && categoriesWithItems === 1 && totalResults > 0 &&
                                searchCategories.map((option, idx) => {
                                    if (!option.items || option.items.length === 0) return
                                    return (
                                        <>
                                            {option.items.map((item, itemIdx) => {
                                                if (itemIdx >= MAX_ITEMS) return
                                                return <ListItem disablePadding key={item.id}>
                                                    <ListItemButton component={Link} to={option.getRoute(item.id)}>
                                                        <ListItemAvatar>
                                                            <UserAvatar name={option.getPrimaryItemText(item)} />
                                                        </ListItemAvatar>
                                                        <ListItemText primary={
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{option.getPrimaryItemText(item)}</Typography>
                                                        }
                                                            secondary={option.getSecondaryItemText?.(item)}
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                            })}
                                            <ListItem disablePadding key={option.id}>
                                                <ListItemButton component={Link} to={`/search?query=${query}&tab=${idx}`} >
                                                    <ListItemText primary={
                                                        <Stack direction="row" sx={{ justifyContent: "center", width: "100%" }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>Ver todo</Typography>
                                                        </Stack>
                                                    }
                                                        secondary={
                                                            <Stack direction="row" sx={{ justifyContent: "center", width: "100%" }}>
                                                                {lengthText(option.items?.length)}
                                                            </Stack>}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        </>
                                    )
                                })
                            }
                        </List>
                    </Paper>
                </SearchOptions>}
        </SearchWrapper>
    )
}
