import type { Id } from './model'

export const PROJECT_FILE_MIME_TYPE = 'application/json'

const FILE_NAME_PREFIX = 'starcad-proje'

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/**
 * Zaman damgası YEREL saatle: dosya adı kullanıcının kendi saatiyle eşleşsin,
 * "az önce indirdiğim hangisiydi" sorusu UTC farkıyla bulanıklaşmasın.
 * (Model içindeki tarihler bu kuralın dışında — onlar sunucudan UTC gelir.)
 */
export function buildProjectFileName(projectId: Id | undefined, at: Date): string {
  const stamp =
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `-${pad(at.getHours())}${pad(at.getMinutes())}`

  // Proje kimliği okunamıyorsa adsız da olsa dosya üretilir; indirme engellenmez.
  const project = projectId === undefined ? '' : `-${projectId}`

  return `${FILE_NAME_PREFIX}${project}-${stamp}.json`
}
