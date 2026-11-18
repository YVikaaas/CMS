import { createTheme } from "@mui/material/styles";

// NiceAdmin MUI look, measured from niceadmin-mui-nextjs-main.vercel.app.
// Override structure follows minimal-ui-kit/material-kit-react (MIT).
// `--ops-*` tokens in globals.css alias the CSS vars this theme emits.
const ink = "rgba(3, 14, 9, 0.8)";
const inkMuted = "rgba(3, 14, 9, 0.7)";
const inkSubtle = "rgba(3, 14, 9, 0.6)";
const line = "rgba(3, 14, 9, 0.1)";
// Readability changes vs NiceAdmin: 3:1 control borders, dark status text, 44px tap targets.
const controlBorder = "rgba(3, 14, 9, 0.45)";
const cardShadow = "0 0 2px 0 rgba(145, 158, 171, 0.3), 0 12px 24px -4px rgba(145, 158, 171, 0.12)";

export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: "#165a50", dark: "#0f443c", light: "#2d7a6e", contrastText: "#ffffff" },
    secondary: { main: "#c2fd75", dark: "#a6e24f", contrastText: "#000000" },
    // light fills (success, warning, info) take dark text so filled alerts and buttons stay readable
    success: { main: "#70c748", dark: "#3d7a22", contrastText: "#030e09" },
    warning: { main: "#f6b51e", dark: "#8a5a00", contrastText: "#030e09" },
    error: { main: "#dc2626", dark: "#b91c1c", contrastText: "#ffffff" },
    info: { main: "#539bff", dark: "#1d5fc4", contrastText: "#030e09" },
    background: { default: "#f5f5f5", paper: "#ffffff" },
    text: { primary: ink, secondary: inkMuted, disabled: inkSubtle },
    divider: line,
    action: { hover: "rgba(5, 59, 37, 0.08)" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-onest), system-ui, sans-serif",
    fontSize: 14,
    h1: { fontSize: 36, fontWeight: 600 },
    h2: { fontSize: 30, fontWeight: 600 },
    h3: { fontSize: 24, fontWeight: 600 },
    h4: { fontSize: 21, fontWeight: 600, lineHeight: 1.22 },
    h5: { fontSize: 18, fontWeight: 600, lineHeight: 1.42 },
    h6: { fontSize: 16, fontWeight: 600 },
    subtitle1: { fontSize: 14, fontWeight: 400, lineHeight: 1.75 },
    subtitle2: { fontSize: 14, fontWeight: 600 },
    body1: { fontSize: 14, lineHeight: 1.5246 },
    body2: { fontSize: 14 },
    button: { textTransform: "none", fontWeight: 400, fontSize: 14 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: line } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: cardShadow } } },
    MuiCardHeader: {
      defaultProps: { slotProps: { title: { variant: "h5" } } },
      styleOverrides: { root: { padding: "16px 24px" } },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 24, "&:last-child": { paddingBottom: 24 } } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, padding: "6px 16px", minHeight: "var(--ops-touch-min)" },
        sizeLarge: { minHeight: "var(--ops-touch-pref)", paddingInline: 22 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
        input: { padding: "12px 14px", ".MuiInputBase-sizeSmall &": { padding: "8px 14px" } },
        notchedOutline: { borderColor: controlBorder },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: inkMuted } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: 12 },
        sizeSmall: { height: 24 },
        clickable: { height: 40, borderRadius: 20, paddingInline: 4 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${line}`, padding: 16, fontSize: 14 },
        head: { fontSize: 15, fontWeight: 500, color: inkSubtle },
      },
    },
    MuiTableRow: { styleOverrides: { hover: { "&:hover": { backgroundColor: "rgba(5, 59, 37, 0.08)" } } } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" }, styleOverrides: { root: { backgroundColor: "#ffffff" } } },
    MuiToolbar: { styleOverrides: { root: { minHeight: 70, "@media (min-width:600px)": { minHeight: 70, paddingInline: 24 } } } },
    MuiDrawer: { styleOverrides: { paper: { borderRight: `1px solid ${line}` } } },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontSize: 12,
          fontWeight: 600,
          lineHeight: "26px",
          padding: "3px 12px",
          marginTop: 24,
          marginLeft: -10,
          color: inkMuted,
          textTransform: "uppercase",
          backgroundColor: "transparent",
          position: "static",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "6px 10px",
          marginBottom: 2,
          color: ink,
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "#165a50", color: "#c2fd75" },
          "&.Mui-selected .MuiListItemIcon-root": { color: "#c2fd75" },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: "inherit" } } },
    MuiListItemText: { styleOverrides: { root: { margin: "4px 0" } } },
    // colorInherit only, so color="success" / "error" row actions keep their colour
    MuiIconButton: { styleOverrides: { colorInherit: { color: inkMuted }, sizeMedium: { width: 44, height: 44 } } },
    MuiCheckbox: { styleOverrides: { root: { color: inkMuted } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, padding: "6px 16px", fontSize: 14, alignItems: "center" },
        filled: { fontWeight: 500 },
      },
    },
    MuiAlertTitle: { styleOverrides: { root: { fontSize: 14, fontWeight: 600, marginBottom: 2 } } },
    MuiAccordion: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: {
          boxShadow: "0 2px 3px rgba(0, 0, 0, 0.1)",
          "&:first-of-type": { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
          "&:last-of-type": { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
          "&::before": { backgroundColor: line },
          "&.Mui-disabled": { backgroundColor: "rgba(73, 82, 88, 0.12)" },
        },
      },
    },
    MuiAccordionSummary: { styleOverrides: { root: { minHeight: 48, padding: "0 16px" }, content: { fontSize: 16, fontWeight: 600 } } },
    MuiAccordionDetails: { styleOverrides: { root: { padding: "8px 16px 16px" } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 48 }, indicator: { height: 2 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 48, padding: "12px 16px", fontSize: 14, fontWeight: 400, textTransform: "capitalize", color: inkMuted } } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { backgroundColor: "rgba(3, 14, 9, 0.9)", fontSize: 12, fontWeight: 500, borderRadius: 8, padding: "6px 10px" },
        arrow: { color: "rgba(3, 14, 9, 0.9)" },
      },
    },
    MuiPopover: { styleOverrides: { paper: { borderRadius: 12, boxShadow: cardShadow } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 12, boxShadow: cardShadow } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: 14, minHeight: 44, borderRadius: 8, margin: "0 6px" } } },
    MuiAvatar: { styleOverrides: { root: { fontSize: 14, fontWeight: 600 } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 6 }, bar: { borderRadius: 6 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 18, fontWeight: 600, padding: "16px 24px" } } },
    MuiDialogContent: { styleOverrides: { root: { padding: 24 } } },
    MuiBreadcrumbs: { styleOverrides: { separator: { margin: "0 8px" } } },
  },
});
