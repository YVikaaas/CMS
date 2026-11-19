import { createTheme } from "@mui/material/styles";

// Material You (MD3) look from the "MaterialMe" kit, colours generated from the CMS teal seed #165a50
// with @material/material-color-utilities (light scheme). `--ops-*` tokens in globals.css alias these.
const md = {
  primary: "#006b5e",
  onPrimary: "#ffffff",
  primaryContainer: "#76f8e2",
  onPrimaryContainer: "#00201b",
  secondaryContainer: "#cde8e1",
  onSecondaryContainer: "#06201b",
  tertiary: "#446179",
  error: "#ba1a1a",
  surface: "#f7faf8",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f4f2",
  surfaceContainer: "#eceeec",
  surfaceContainerHigh: "#e6e9e7",
  surfaceContainerHighest: "#e0e3e1",
  onSurface: "#191c1b",
  onSurfaceVariant: "#3f4946",
  outline: "#6f7976",
  inverseSurface: "#2d3130",
  inverseOnSurface: "#eff1ef",
};
const stateHover = "rgba(25, 28, 27, 0.08)"; // MD3 hover state layer: on-surface at 8%
const offsetShadow = `4px 4px 0 ${md.onSurface}`; // kit hover: solid offset shadow

export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: md.primary, dark: "#005047", light: "#2a8576", contrastText: md.onPrimary },
    // MD3 primary-container: the kit's tonal accent (primary buttons, active nav, badges)
    secondary: { main: md.primaryContainer, dark: "#55dbc6", contrastText: md.onPrimaryContainer },
    success: { main: "#386a20", dark: "#386a20", light: "#c3efad", contrastText: "#ffffff" },
    warning: { main: "#7c5800", dark: "#7c5800", light: "#ffdea6", contrastText: "#ffffff" },
    error: { main: md.error, dark: "#93000a", light: "#ffdad6", contrastText: "#ffffff" },
    info: { main: md.tertiary, dark: "#2c4961", light: "#cae6ff", contrastText: "#ffffff" },
    background: { default: md.surface, paper: md.surfaceContainerLowest },
    text: { primary: md.onSurface, secondary: md.onSurfaceVariant, disabled: "rgba(25, 28, 27, 0.38)" },
    divider: md.surfaceContainerHighest,
    action: { hover: stateHover },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-lexend), system-ui, sans-serif",
    fontSize: 14,
    // MD3 type scale (display / headline / title / label / body)
    h1: { fontSize: 45, lineHeight: "52px", fontWeight: 400 },
    h2: { fontSize: 36, lineHeight: "44px", fontWeight: 400 },
    h3: { fontSize: 28, lineHeight: "36px", fontWeight: 400 },
    h4: { fontSize: 36, lineHeight: "44px", fontWeight: 500 }, // page title, as the kit's "Products"
    h5: { fontSize: 22, lineHeight: "28px", fontWeight: 500 },
    h6: { fontSize: 16, lineHeight: "24px", fontWeight: 500, letterSpacing: "0.15px" },
    subtitle1: { fontSize: 16, lineHeight: "24px", fontWeight: 400 },
    subtitle2: { fontSize: 14, lineHeight: "20px", fontWeight: 500, letterSpacing: "0.1px" },
    body1: { fontSize: 14, lineHeight: "20px", letterSpacing: "0.25px" },
    body2: { fontSize: 14, lineHeight: "20px", letterSpacing: "0.25px" },
    button: { textTransform: "none", fontWeight: 500, fontSize: 14, lineHeight: "20px", letterSpacing: "0.1px" },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: md.surfaceContainerHighest } } },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, border: `1px solid ${md.surfaceContainerHighest}`, boxShadow: "none", backgroundColor: md.surfaceContainerLowest },
      },
    },
    MuiCardHeader: { defaultProps: { slotProps: { title: { variant: "h6" } } }, styleOverrides: { root: { padding: "12px 16px 8px" } } },
    MuiCardContent: { styleOverrides: { root: { padding: 16, "&:last-child": { paddingBottom: 16 } } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 20, padding: "0 16px", minHeight: 40, fontSize: 14, lineHeight: "20px", transition: "box-shadow 150ms, transform 150ms, background-color 150ms" },
        sizeLarge: { minHeight: "var(--ops-touch-pref)", paddingInline: 28 },
        outlined: { borderColor: md.outline },
      },
      variants: [
        {
          // Kit primary action: tonal fill, dark outline, solid offset shadow on hover
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: md.primaryContainer,
            color: md.onPrimaryContainer,
            border: `1.5px solid ${md.onSurface}`,
            "&:hover": { backgroundColor: md.primaryContainer, boxShadow: offsetShadow, transform: "translate(-2px, -2px)" },
            "&:active": { boxShadow: "none", transform: "none" },
            "&.Mui-disabled": { borderColor: "rgba(25, 28, 27, 0.12)" },
            "@media (prefers-reduced-motion: reduce)": { "&:hover": { transform: "none" } },
          },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: { color: md.primary, "&:hover": { backgroundColor: "rgba(0, 107, 94, 0.08)" } },
        },
      ],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: "transparent" },
        input: { padding: "12px 16px", ".MuiInputBase-sizeSmall &": { padding: "8px 14px" } },
        notchedOutline: { borderColor: md.outline },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: md.onSurfaceVariant } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: 13, borderRadius: 8 },
        sizeSmall: { height: 24, borderRadius: 8 },
        outlined: { borderColor: md.outline },
        clickable: { height: 40, paddingInline: 4 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${md.surfaceContainerHighest}`, padding: "8px 12px", fontSize: 14, lineHeight: "20px" },
        head: { fontSize: 14, fontWeight: 500, lineHeight: "20px", color: md.onSurface },
      },
    },
    MuiTableRow: { styleOverrides: { hover: { "&:hover": { backgroundColor: stateHover } } } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" }, styleOverrides: { root: { backgroundColor: md.surface } } },
    MuiToolbar: { styleOverrides: { root: { minHeight: 64, "@media (min-width:600px)": { minHeight: 64, paddingInline: 24 } } } },
    MuiDrawer: { styleOverrides: { paper: { borderRight: "none" } } },
    MuiListSubheader: {
      styleOverrides: {
        root: { fontSize: 14, fontWeight: 500, lineHeight: "20px", padding: "18px 16px 12px", color: md.onSurfaceVariant, backgroundColor: "transparent", position: "static" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          minHeight: 56,
          padding: "0 16px",
          marginBottom: 4,
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: md.secondaryContainer, color: md.onSecondaryContainer },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 40, color: "inherit" } } },
    MuiListItemText: { styleOverrides: { root: { margin: 0 }, primary: { fontSize: 15, fontWeight: 500, letterSpacing: "0.1px" } } },
    // colorInherit only, so color="success" / "error" row actions keep their colour
    MuiIconButton: { styleOverrides: { colorInherit: { color: md.onSurfaceVariant }, sizeMedium: { width: 44, height: 44 } } },
    MuiCheckbox: { styleOverrides: { root: { color: md.onSurfaceVariant } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 28, backgroundColor: md.surfaceContainerHigh } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 24, lineHeight: "32px", fontWeight: 400, padding: "24px 24px 16px" } } },
    MuiDialogContent: { styleOverrides: { root: { padding: "0 24px 24px" } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, padding: "6px 16px", fontSize: 14, alignItems: "center" } } },
    MuiAlertTitle: { styleOverrides: { root: { fontSize: 14, fontWeight: 500, marginBottom: 2 } } },
    MuiAccordion: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${md.surfaceContainerHighest}`,
          "&:first-of-type": { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
          "&:last-of-type": { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
          "&::before": { display: "none" },
          "&.Mui-disabled": { backgroundColor: md.surfaceContainerLow },
        },
      },
    },
    MuiAccordionSummary: { styleOverrides: { root: { minHeight: 56, padding: "0 16px" }, content: { fontSize: 16, fontWeight: 500 } } },
    MuiAccordionDetails: { styleOverrides: { root: { padding: "0 16px 16px" } } },
    // MD3 primary tabs: 48px, label-large, 3px rounded indicator, divider under the row
    MuiTabs: {
      defaultProps: { textColor: "inherit" },
      styleOverrides: {
        root: { minHeight: 48, borderBottom: `1px solid ${md.surfaceContainerHighest}` },
        indicator: { height: 3, borderRadius: "3px 3px 0 0", backgroundColor: md.onSurface },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 48, padding: "12px 24px", fontSize: 15, fontWeight: 500, letterSpacing: "0.1px",
          textTransform: "none", color: md.onSurfaceVariant, opacity: 1, "&.Mui-selected": { color: md.onSurface },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: false },
      styleOverrides: { tooltip: { backgroundColor: md.inverseSurface, color: md.inverseOnSurface, fontSize: 13, fontWeight: 400, borderRadius: 8, padding: "8px 12px" } },
    },
    MuiPopover: { styleOverrides: { paper: { borderRadius: 12, backgroundColor: md.surfaceContainer, boxShadow: "var(--ops-shadow-pop)" } } },
    // MD3 menu: 4px container, 8px list padding, 48px items, selected = secondary-container + check
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 4, backgroundColor: md.surfaceContainer, boxShadow: "var(--ops-shadow-pop)", minWidth: 160 },
        list: { padding: "4px 0" },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          lineHeight: "20px",
          letterSpacing: "0.1px",
          minHeight: 40,
          padding: "0 12px",
          gap: 12,
          "@media (min-width:600px)": { minHeight: 40 },
          "&:hover": { backgroundColor: stateHover },
          "&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible": {
            backgroundColor: md.secondaryContainer,
            color: md.onSecondaryContainer,
            fontWeight: 500,
          },
          "&.Mui-selected::after": {
            content: '""',
            marginLeft: "auto",
            width: 18,
            height: 18,
            backgroundColor: "currentColor",
            mask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E\") center / contain no-repeat",
          },
        },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontSize: 14, fontWeight: 500 } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 4, borderRadius: 2, backgroundColor: md.secondaryContainer }, bar: { borderRadius: 2 } } },
    MuiBreadcrumbs: { styleOverrides: { separator: { margin: "0 6px" } } },
  },
});
