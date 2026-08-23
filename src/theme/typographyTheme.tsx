export const FONT_FAMILY = {
    display: 'Sora, Inter, sans-serif',
    body: 'Inter, sans-serif',
}
export const FONT_SIZES = {
    xs: ".75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
}
export const TITLE_LINE_HEIGHT = 1.2

export const textTheme = {
    root: {
        lineHeight: 1.4,
        fontSize: "1rem"
    },
    title: {
        h1: { fontSize: '1.9rem', fontWeight: 700, lineHeight: TITLE_LINE_HEIGHT },
        h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: TITLE_LINE_HEIGHT },
        h3: { fontSize: '1.17rem', fontWeight: 600, lineHeight: TITLE_LINE_HEIGHT },
        h4: { fontSize: '1rem', fontWeight: 600, lineHeight: TITLE_LINE_HEIGHT },
        h5: { fontSize: '.83rem', fontWeight: 500, lineHeight: TITLE_LINE_HEIGHT },
        h6: { fontSize: '.67rem', fontWeight: 500, lineHeight: TITLE_LINE_HEIGHT },
    },
    variants: {
        body1: { fontSize: FONT_SIZES.md },
        body2: { fontSize: FONT_SIZES.sm },
        subtitle1: { fontSize: FONT_SIZES.md },
        subtitle2: { fontSize: FONT_SIZES.sm },
        caption: { fontSize: FONT_SIZES.xs },
        overline: { fontSize: FONT_SIZES.xs },
        button: {
            fontSize: FONT_SIZES.sm,
            textTransform: 'none',
            fontWeight: 500
        },
    }
}
