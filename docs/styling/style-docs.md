## MUI Styling Documentation: Replicating "Die Linke Frankfurt"

This document outlines how to replicate the styling of the "Die Linke Frankfurt" website using the MUI component library and its theming capabilities.

### 1. Theme Configuration (`createTheme`)

The foundation will be a custom theme. Define these in your `createTheme` options:

```javascript
import { createTheme } from '@mui/material/styles';
import OpenSans from 'path/to/your/open-sans-font-files'; // Ensure you have font files or use a CDN

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF0000', // Brand Red
      dark: '#b30000',  // Darker Red for hover
    },
    secondary: { // Example, can be adjusted if another distinct color is needed
      main: '#006473', // Dark Teal/Cyan for the "Willkommen" bar
    },
    common: {
      black: '#000000',
      white: '#FFFFFF',
    },
    text: {
      primary: '#000000',   // Main text, headings
      secondary: '#333333', // Sub-headings, meta text, sub-menu items
    },
    background: {
      default: '#FFFFFF', // Main page background
      paper: '#FFFFFF',   // Drawer, Card backgrounds
      darkHeader: '#222222', // Custom for the top utility bar
    },
    grey: {
      100: '#f0f0f0', // Light backgrounds, inputs
      300: '#e5e5e5', // Borders, dividers (<hr>)
      400: '#dddddd', // Common borders
      500: '#cccccc', // Slightly darker gray borders
      700: '#262626', // Footer background (if needed)
    },
    action: {
      active: '#DE0000', // For active states like navigation
    },
    divider: '#000000', // Or a dark grey like grey[700] for menu item separators
  },
  typography: {
    fontFamily: '"Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600, // Semibold
    fontWeightBold: 700,   // Bold

    // Adjust variants to match website's hierarchy
    h1: { // Site Title (if distinct) - not really visible in screenshot's context
      fontWeight: 700,
      fontSize: '2.2rem', // approx 35px
    },
    h4: { // Main section headings e.g., "Die Linke Frankfurt - gerecht..."
      fontWeight: 700,
      fontSize: '1.75rem', // approx 28px
    },
    h5: { // Sub-headings e.g., "Gemeinsam den Aufwind nutzen!"
      fontWeight: 700,
      fontSize: '1.5rem', // approx 24px
    },
    h6: { // Drawer title, Widget titles
      fontWeight: 600,
      fontSize: '1.25rem', // approx 20px
    },
    subtitle1: { // Main navigation items
      fontWeight: 700, // or 600
      fontSize: '1.125rem', // approx 18px
    },
    body1: { // Standard body text, sub-navigation items
      fontWeight: 400,
      fontSize: '1rem', // 16px
      lineHeight: 1.6,
    },
    body2: { // Meta text, breadcrumbs, top bar text
      fontWeight: 400,
      fontSize: '0.875rem', // 14px
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Original site doesn't use uppercase buttons
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 300;
          src: local('Open Sans Light'), local('OpenSans-Light'), url(${OpenSansLightWoff2}) format('woff2');
        }
        // Add other weights (400, 600, 700) similarly
      `,
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0, // Site header doesn't show strong shadows usually
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square buttons
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#b30000', // theme.palette.primary.dark
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: ({ ownerState, theme }) => ({
          // Example: For bold main nav items in drawer
          // if (ownerState./* some condition for main nav */) {
          //   return { fontWeight: theme.typography.fontWeightBold };
          // }
        }),
      },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: ({ theme }) => ({
                boxShadow: theme.shadows[3], // Example shadow for separation
                width: 300, // Or responsive width
            }),
        },
    },
  },
});
```

### 2. Layout Components

*   **Main Structure:** Use `<Box>` or standard HTML5 elements (`<header>`, `<main>`, `<footer>`) styled with the `sx` prop.
*   **Container:** Wrap main page sections with `<Container maxWidth="lg">` (or `md`, `xl` depending on desired max width).
    *   `sx={{ py: 3 }}` for vertical padding.
*   **Grid System:** Use `<Grid container spacing={2}>` for rows and `<Grid size={{ xs: 12 }}>` for columns. Since there's no sidebar in the screenshot's context, main content would be `<Grid size={{ xs: 12 }}>`.

### 3. Header Elements (MUI Implementation)

*   **Top Utility Bar:**
    *   Component: `<AppBar position="static" sx={{ backgroundColor: 'background.darkHeader' }}>`
    *   Content: `<Toolbar variant="dense">`
        *   Site Name: `<Typography variant="body2" sx={{ flexGrow: 1, color: 'common.white', fontWeight: 'fontWeightMedium' }}>Die Linke Kreisverband Frankfurt</Typography>`
        *   Icons:
            *   `<IconButton color="inherit"> <SearchIcon /> </IconButton>`
            *   `<IconButton edge="end" color="inherit" aria-label="menu" onClick={handleDrawerToggle}> <MenuIcon /> </IconButton>` (where `handleDrawerToggle` controls the Drawer state)
            *   Import icons: `import SearchIcon from '@mui/icons-material/Search'; import MenuIcon from '@mui/icons-material/Menu';`
*   **Main Header Area (Logo + Background Image):**
    *   Container: `<Box sx={{ position: 'relative', backgroundImage: 'url(/path/to/cityscape.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', py: { xs: 2, md: 4 } }}>`
    *   Overlay: `<Container maxWidth="lg">` inside the `Box`.
    *   Logo:
        *   Logo can be found in this project in the folder `public/images/logo.png`
        *   A `<Box>` or `<Stack direction="column" alignItems="flex-start">`.
        *   Red Part: `<Box sx={{ bgcolor: 'primary.main', color: 'common.white', px: 2, py: 1, transform: 'skewX(-15deg)' /* or use SVG */, mb: 0.5 }}> <Typography variant="h5" sx={{ fontWeight: 'fontWeightBold', transform: 'skewX(15deg)' /* to unskew text */ }}>Die Línke</Typography> </Box>`
        *   White Part: `<Box sx={{ bgcolor: 'background.paper', color: 'text.primary', px: 2, py: 1 }}> <Typography variant="subtitle1" sx={{ fontWeight: 'fontWeightMedium' }}>Kreisverband Frankfurt</Typography> </Box>`
*   **Breadcrumbs:**
    *   Component: `<Breadcrumbs aria-label="breadcrumb" sx={{ py: 1 }}>` inside a `<Container>`.
    *   Items:
        *   `<Link component={RouterLink} to="/" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}> <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Home </Link>`
        *   `<Typography color="text.primary">Start</Typography>`
        *   Import: `import HomeIcon from '@mui/icons-material/Home';`

### 4. Navigation Menu (MUI Drawer)

*   Component: `<Drawer anchor="right" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true /* Better SEO for GSC */ }}>`
*   **Drawer Content:**
    *   Header in Drawer:
        *   `<Toolbar sx={{ justifyContent: 'space-between' }}>`
            *   `<Typography variant="h6" sx={{ color: 'text.primary' }}>Die Linke Kreisverband Frankfurt</Typography>`
            *   `<IconButton onClick={handleDrawerToggle} sx={{ color: 'text.primary' }}> <CloseIcon /> </IconButton>`
            *   Import: `import CloseIcon from '@mui/icons-material/Close';`
    *   Menu List: `<List component="nav">`
        *   **Main Item (Active):**
            ```jsx
            <ListItemButton
              component={RouterLink} // if using react-router
              to="/start"
              selected // if current route
              sx={{
                '&.Mui-selected': {
                  color: 'primary.main',
                  '& .MuiListItemText-primary': {
                    fontWeight: 'fontWeightBold',
                    color: 'primary.main',
                  },
                },
                borderBottom: 1,
                borderColor: 'divider', // Uses theme.palette.divider
              }}
            >
              <ListItemText primary="Start" primaryTypographyProps={{ fontWeight: 'fontWeightBold', color: 'inherit' }} />
            </ListItemButton>
            ```
        *   **Main Item (Inactive):**
            ```jsx
            <ListItemButton component={RouterLink} to="/themen" sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemText primary="Themen" primaryTypographyProps={{ fontWeight: 'fontWeightBold', color: 'text.primary' }} />
            </ListItemButton>
            ```
        *   **Parent Item with Sub-items (Example: "Partei"):**
            ```jsx
            // State for collapse: const [openPartei, setOpenPartei] = React.useState(true);
            <ListItemButton onClick={() => setOpenPartei(!openPartei)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemText primary="Partei" primaryTypographyProps={{ fontWeight: 'fontWeightBold', color: 'text.primary' }} />
              {openPartei ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openPartei} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton component={RouterLink} to="/partei/kreisvorstand" sx={{ pl: 4 }}>
                  <ListItemText primary="Kreisvorstand" primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItemButton>
                {/* ... other sub-items ... */}
              </List>
            </Collapse>
            ```
            Import: `import ExpandLess from '@mui/icons-material/ExpandLess'; import ExpandMore from '@mui/icons-material/ExpandMore';`
            And: `import Collapse from '@mui/material/Collapse';`

### 5. Specific Content Elements

*   **Red Highlight Bar ("Die Linke Frankfurt - gerecht..."):**
    *   `<Box sx={{ bgcolor: 'primary.main', color: 'common.white', p: { xs: 2, md: 3 }, textAlign: 'center' }}>`
        *   `<Typography variant="h4" component="h2" sx={{ fontWeight: 'fontWeightBold' }}>Die Linke Frankfurt - gerecht, ökologisch und sozial!</Typography>`
    *   `<Box sx={{ bgcolor: 'secondary.main', color: 'common.white', p: 1.5, textAlign: 'center' }}>`
        *   `<Typography variant="body1">Willkommen auf unserer Seite. Miteinander für gerechte Politik in Frankfurt.</Typography>`
*   **Content Headings:**
    *   `<Typography variant="h5" component="h3" sx={{ fontWeight: 'fontWeightBold', mb: 2 }}>Gemeinsam den Aufwind nutzen!</Typography>`
*   **Body Text:**
    *   `<Typography variant="body1" paragraph>...</Typography>`
*   **Links within content:**
    *   `<Link href="#" color="primary" underline="hover">...</Link>`

### Notes:

*   **State Management:** The `open` state for the `Drawer` and `Collapse` components will need to be managed (e.g., using React `useState`).
*   **Routing:** Use `component={RouterLink}` from `react-router-dom` (or your preferred routing library) for navigation links on `ListItemButton`, `Button`, and `Link` components.
*   **Responsiveness:** MUI's `Grid` and breakpoint syntax in the `sx` prop (e.g., `fontSize: { xs: '1rem', md: '1.2rem' }`) are key.
*   **Custom SVGs:** For the angled logo shape, using an SVG might be easier for precise control than CSS transforms, especially if the text inside shouldn't be skewed.