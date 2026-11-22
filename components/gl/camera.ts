export const FOV = 35;
export const CAM_Z = 6;
/** world units per CSS px on the z = 0 plane for the fixed camera */
export const worldPerPx = (vh: number) => (2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180)) / vh;
