# The Design System: Editorial Focus & Tonal Depth

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Sanctuary"**

This design system rejects the frantic, cluttered aesthetic of traditional productivity tools. Instead, it adopts the philosophy of **Soft Minimalism**—a high-end, editorial approach that treats the workspace as a focused sanctuary. 

We move beyond the "SaaS template" by utilizing intentional asymmetry, oversized typographic scales, and layered depth. The experience should feel like a premium physical workspace: expansive, quiet, and meticulously organized. We achieve this not through lines and boxes, but through **Tonal Layering** and **Atmospheric Perspective**, ensuring the user feels a sense of "calm reliability" from the first interaction.

---

## 2. Colors & Surface Architecture

The palette is rooted in deep, authoritative blues and airy, breathable aquas. However, the secret to a premium feel lies in how these colors interact to create volume.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background color shifts. Use `surface-container-low` (lighter) against a `surface` background to define areas. If a section needs to feel "tucked away," use a shift to `surface-container-high`. Lines create visual friction; color transitions create flow.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, semi-transparent sheets of fine paper or frosted glass.
*   **Base:** `surface` (#fcf9f8)
*   **Sectioning:** `surface-container-low` (#f6f3f2)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) to provide a "pop" of clarity.
*   **Active Overlays:** `surface-bright` (#fcf9f8) with a backdrop blur.

### The "Glass & Gradient" Rule
To elevate the platform above "flat" design, utilize Glassmorphism for floating UI elements (like session timers or participant chips).
*   **Floating Elements:** Use `on-surface` at 5% opacity with a `backdrop-filter: blur(12px)`.
*   **Signature Textures:** For primary CTAs and Hero sections, apply a subtle linear gradient from `primary` (#003076) to `primary-container` (#0245a3) at a 135-degree angle. This adds "visual soul" and a sense of light source.

---

## 3. Typography: The Editorial Voice

We utilize a sophisticated pairing of **F37 Ginger** for high-impact brand moments and **Inter** (integrated as our clean, functional sans-serif) for high-utility tasks.

*   **Display & Headlines:** Use **F37 Ginger**. These should be oversized (`display-lg`: 3.5rem) with tighter letter-spacing (-0.02em) to create an authoritative, editorial feel.
*   **Functional Text:** **Inter** handles all body and label roles. Its neutral, geometric construction ensures legibility during deep work sessions.
*   **Asymmetric Scaling:** Do not feel pressured to center-align everything. Use large `headline-lg` type left-aligned against wide open space to evoke the feeling of a premium magazine layout.

---

## 4. Elevation & Depth

We eschew traditional drop shadows in favor of **Tonal Layering**. Depth is a property of color, not just light.

### The Layering Principle
Create "natural lift" by stacking surface tokens. A `surface-container-lowest` card placed on a `surface-container-low` background creates a soft, legible distinction that feels integrated rather than floating.

### Ambient Shadows
When a component must float (e.g., a modal or a floating action button):
*   **Shadow Specs:** Blur: 32px to 64px. Opacity: 4% to 8%.
*   **Shadow Tint:** Instead of #000000, use a tinted version of `on-surface` (#1c1b1b). This mimics natural ambient light and prevents the UI from looking "dirty."

### The "Ghost Border" Fallback
If accessibility requirements (WCAG) demand a container edge, use a **Ghost Border**:
*   **Token:** `outline-variant` (#c3c6d4) at **15% opacity**. This provides a hint of a boundary without interrupting the visual flow.

---

## 5. Components

### Buttons: The Tactile Interaction
*   **Primary:** Gradient of `primary` to `primary-container`. `xl` (0.75rem) rounded corners. Subtle scale-down (0.98) on click.
*   **Secondary:** `secondary-container` (#99c4fd) background with `on-secondary-container` (#205083) text. No border.
*   **Tertiary:** Text only using `primary` color. Ghost border appears only on hover.

### Cards & Lists: The Open Space Rule
*   **Forbid Dividers:** Do not use horizontal lines between list items. Use 16px to 24px of vertical white space or a subtle hover state shift to `surface-container-highest` to define rows.
*   **Co-working Video Tiles:** Use a `xl` (0.75rem) corner radius. Overlay participant names using a Glassmorphic chip (`surface-container-lowest` at 60% opacity with blur).

### Inputs: The Quiet Field
*   **State:** Background should be `surface-container-highest`. Upon focus, the background shifts to `surface-container-lowest` with a 1px "Ghost Border" of `primary`.
*   **Focus:** Avoid high-contrast glow. Use a subtle 2px inset shadow to make the field feel "pressed" into the surface.

### Context-Specific: The "Focus Timer"
*   A large, `display-lg` typographic element. Use a subtle pulse animation on the `tertiary_container` color to indicate an active session without distracting the user from their work.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Negative Space:** Allow elements to "breathe." If a layout feels crowded, remove a container before you shrink the text.
*   **Use Intentional Asymmetry:** Balance a heavy text block on the left with a large, airy image or empty space on the right.
*   **Prioritize Type Scale:** Use `headline-sm` for section headers instead of bolding body text.

### Don’t:
*   **Don't use 100% Black:** Use `on-surface` (#1c1b1b) for text to maintain a soft, premium feel.
*   **Don't use standard "Card Shadows":** Rely on background color shifts first. Only use shadows for elements that truly "float" over the rest of the interface.
*   **Don't use Dividers:** If you feel the need to draw a line, try adding 8px of padding instead. Keep the "Digital Sanctuary" clean.