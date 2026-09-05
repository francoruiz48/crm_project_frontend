import type { CampaignParams, Paginable } from "src/types/shared"
import type { Campaign, CampaignDetailed, CampaignPost } from "src/types/campaigns"
import axiosCRM from "src/lib/axios"


/******************************** Campaigns ************************************/
export const getCampaigns = async<T extends CampaignParams>(params?: T):
    Promise<Paginable<T["detailed"] extends true ? CampaignDetailed : Campaign>> => {
    const campaigns = await axiosCRM.get(`/campaigns`, { params })
    return campaigns.data
}

export const getCampaign = async (id: string): Promise<CampaignDetailed> => {
    // detailed: true es obligatorio: sin él el backend devuelve CampaignResponse (sin
    // creator/updater, que solo existen en CampaignDetailedResponse) y el front cae al
    // fallback "Sistema" en DetailsMetadata aunque la campaña sí tenga creador/editor
    // reales. Mismo patrón de bug ya resuelto antes en getFieldAutomation (ver ese archivo).
    const campaign = await axiosCRM.get(`/campaigns/${id}`, { params: { detailed: true } })
    return campaign.data
}

export const createCampaign = async (body: CampaignPost): Promise<CampaignDetailed> => {
    const campaign = await axiosCRM.post(`/campaigns`, body)
    return campaign.data
}

export const updateCampaign = async (body: CampaignPost, id: string): Promise<CampaignDetailed> => {
    const campaign = await axiosCRM.put(`/campaigns/${id}`, body)
    return campaign.data
}
