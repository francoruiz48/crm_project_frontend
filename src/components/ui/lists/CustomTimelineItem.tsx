import React from 'react'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'
import { MetadataItem } from '../details/DetailsMetadata'
import type { LeadAudit } from 'src/types/leads'
import type { Creator } from 'src/types/shared'
import { UserAvatar } from '../details/UserAvatar'

export const CustomTimelineItem = ({ entity, selected = false, last = false, children }: { entity: LeadAudit, selected?: boolean, last?: boolean, children?: React.ReactNode }) => {

    const user = entity.creator

    const getUserFullName = (user?: Creator | null) => {
        if (!user) return "Sistema"
        return [user.name, user.last_name].filter(Boolean).join(" ")
    }

    const metadata = { name: user?.name ?? "Sistema", date: entity.created_at, email: user?.email ?? "Sistema" }

    return (
        <TimelineItem>
            <TimelineOppositeContent>
                <MetadataItem {...metadata} size="small" noIcon short noHour={!selected} />
            </TimelineOppositeContent>
            <TimelineSeparator>
                <TimelineDot sx={{ backgroundColor: "transparent", p: 0 }}>
                    <UserAvatar name={getUserFullName(entity.creator)} noRing={!selected} />
                </TimelineDot>
                {!last && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>{children}</TimelineContent>
        </TimelineItem>
    )
}