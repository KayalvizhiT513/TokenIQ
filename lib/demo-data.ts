/** Set SHOW_SYNTHETIC_DATA=false to exclude seeded PR estimates from all analytics APIs. */
export const showSyntheticData = process.env.SHOW_SYNTHETIC_DATA !== 'false'

export const usageRecordVisibilityFilter = showSyntheticData ? {} : { isSynthetic: false }
