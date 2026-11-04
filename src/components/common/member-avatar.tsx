import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { initials } from '@/lib/initials'
import type { TeamMember } from '@/lib/types'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
}

export function MemberAvatar({
  member,
  size = 'sm',
  className,
  tooltip = false,
}: {
  member: Pick<TeamMember, 'name' | 'color' | 'avatar_url'>
  size?: keyof typeof SIZES
  className?: string
  tooltip?: boolean
}) {
  const el = (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-card',
        SIZES[size],
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${member.color}, color-mix(in oklch, ${member.color} 70%, black))` }}
      aria-label={member.name}
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        initials(member.name)
      )}
    </span>
  )
  if (!tooltip) return el
  return (
    <Tooltip>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      <TooltipContent>{member.name}</TooltipContent>
    </Tooltip>
  )
}

export function AvatarStack({ members, max = 3, size = 'sm' }: { members: TeamMember[]; max?: number; size?: keyof typeof SIZES }) {
  if (members.length === 0) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map((m) => (
        <MemberAvatar key={m.id} member={m} size={size} tooltip />
      ))}
      {extra > 0 && (
        <span className={cn('inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-card', SIZES[size])}>
          +{extra}
        </span>
      )}
    </div>
  )
}
