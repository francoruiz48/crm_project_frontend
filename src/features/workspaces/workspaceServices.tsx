import type { Paginable, WorkspaceParams } from "src/types/shared"
import type { Workspace, WorkspaceDetailed, WorkspacePost } from "src/types/campaigns"
import axiosCRM from "src/lib/axios"

export const getWorkspaces = async<T extends WorkspaceParams>(params?: T):
    Promise<Paginable<
        T["detailed"] extends true ? WorkspaceDetailed : Workspace>> => {
    const wsp = await axiosCRM.get(`workspaces`, { params })
    return wsp.data
}
export const getWorkspace = async (id: string): Promise<WorkspaceDetailed> => {
    const wsp = await axiosCRM.get(`workspaces/${id}`)
    return wsp.data
}
export const createWorkspace = async (body: WorkspacePost): Promise<WorkspaceDetailed> => {
    const wsp = await axiosCRM.post(`workspaces`, body)
    return wsp.data
}
export const updateWorkspace = async (body: WorkspacePost, id: string): Promise<WorkspaceDetailed> => {
    const wsp = await axiosCRM.put(`workspaces/${id}`, body)
    return wsp.data
}