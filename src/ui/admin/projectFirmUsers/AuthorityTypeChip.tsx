import { authorityChipVariants } from './authorityChipVariants'
import { AUTHORITY_TYPE_LABELS, type AuthorityType } from '../../../api/projectFirmUserDto'

interface AuthorityTypeChipProps {
  value: AuthorityType
}

export function AuthorityTypeChip({ value }: AuthorityTypeChipProps) {
  return (
    <span
      className={authorityChipVariants({
        tone: value === 'firmEngineer' ? 'engineer' : 'authorizedPerson',
      })}
    >
      {AUTHORITY_TYPE_LABELS[value]}
    </span>
  )
}
