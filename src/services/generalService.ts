import type { Dictionary, SearchResults } from "../types/shared";
import axiosCRM from "src/lib/axios";

type DictTypes = keyof Dictionary

export const getDictionaries = async (keys: DictTypes[]): Promise<Dictionary> => {
  const res = await axiosCRM.get(`/metadata/dictionaries`, { params: { keys: keys.join(",") } })
  return res.data
}

export const generalSearch = async (query: string): Promise<SearchResults> => {
  const res = await axiosCRM.get(`/search`, { params: { query } })
  return res.data
}