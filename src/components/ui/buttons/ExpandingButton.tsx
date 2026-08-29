import { styled } from "@mui/material"
import CommonButton, { type CommonBtnProps } from "./CommonButton"

const ExpandingButton = styled(CommonButton, {
    shouldForwardProp: (prop) => prop !== "variableWidth"
}
)(
    ({ variableWidth = false }) => {
        return {
            width: variableWidth ? "auto" : "10rem",
            "& .MuiBox-root": {
                maxWidth: 0,
                overflow: "hidden",
                marginLeft: 0,
                transition: "all ease-in-out .3s",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            },
            "&:hover .MuiBox-root": {
                maxWidth: "6.25rem",
                marginLeft: ".25rem",
                transition: "all ease-in-out .3s"
            }
        }
    }
)

export const ListAddButton = ({ children, expanded = false, ...props }: CommonBtnProps & { expanded?: boolean }) => {

    if (expanded) return (
        <CommonButton actionType='CREATE' {...props}>
            {children ?? "Agregar"}
        </CommonButton>
    )
    return (
        <ExpandingButton actionType='CREATE' {...props}>
            {children ?? "Agregar"}
        </ExpandingButton>
    )
}