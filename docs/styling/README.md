# Styling Guide for Die Linke Frankfurt Application

This document outlines the styling approach used in this application, matching the Die Linke Frankfurt styling guidelines.

## Theme Implementation

The application uses Material UI's theming system to implement a consistent visual identity that mirrors the Die Linke Frankfurt main website. The theme is defined in `/src/theme/theme.ts`.

### Color Palette

- **Primary**: `#FF0000` (Brand Red) - Used for main actions, highlighted text, and brand elements
- **Secondary**: `#006473` (Dark Teal) - Used for secondary elements like welcome bars
- **Background**: Several variants including dark header (`#222222`)
- **Text**: Primary (`#000000`), Secondary (`#333333`)

### Typography

The application uses a typography hierarchy based on Open Sans:

- **Headings**: Bold (700) weight for prominence
- **Navigation**: Semibold (600) weight  
- **Body text**: Regular (400) weight

### Components Styling

The theme includes custom styling for common components:

- **Buttons**: Square (no border radius), no drop shadows, clear hover states
- **Cards**: Minimal styling with subtle shadows
- **Form Elements**: Square inputs with brand-colored focus states
- **Navigation**: Bold text for active items with brand color

## Layout Structure

The application follows a consistent layout structure:

1. **Utility Bar**: Dark header with search and menu buttons
2. **Logo Area**: Brand logo with skewed red box effect
3. **Breadcrumbs**: Simple navigation context
4. **Main Content**: 
   - Headline bar (red background)
   - Welcome message (teal background)
   - CTA button for appointment creation
   - Content area with appointments in a card grid

## Responsive Design

The layout adapts to different screen sizes:
- Mobile drawer navigation on smaller screens
- Responsive grid for appointment cards (1, 2, or 3 columns depending on screen width)
- Adjusted padding and font sizes for different breakpoints

## Adding New Pages

When adding new pages:

1. Include the standard header components (utility bar, logo area, breadcrumbs)
2. Use the same container max-width (`lg`)
3. Maintain consistent typography and spacing
4. Follow the established card and button styling

## Icons

The application uses Material UI icons with consistent styling:
- Used in buttons and chips for better affordance
- Consistent sizing
- Proper color inheritance

## CSS Approach

The application uses Material UI's `sx` prop for styling, which allows:
- Direct access to theme values
- Responsive property values
- Automatic handling of vendor prefixes

## Accessibility

The styling maintains good accessibility:
- Sufficient color contrast
- Clear focus states
- Proper heading hierarchy
- Semantic HTML structure