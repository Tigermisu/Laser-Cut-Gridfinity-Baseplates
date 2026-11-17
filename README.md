# GridCut — Laser-Cut Gridfinity Baseplate Generator

**Live App:** [https://gridcut-laser-cut-gridfinity-baseplate-generator.ai.studio](https://gridcut-laser-cut-gridfinity-baseplate-generator.ai.studio)

**GridCut** is a parametric 2D CAD generator that converts the open-source 3D Gridfinity baseplate specification into flat, millimeter-accurate **DXF** and **SVG** vector cut sheets for CO₂, diode, and fiber laser cutters. Instead of spending hours 3D-printing flat baseplate grids, you can laser-cut laminated plywood, MDF, or acrylic sheets in minutes with exact kerf compensation and interlocking bed-split joinery.

---

## Features

- **3 Laser-Cut Layer Stack Architectures**
  - **2-Layer Standard Stack (`3.0 mm` Grid + `1.5 mm` Base):** Cuts `37.4 mm` (`R1.85 mm`) shoulder pockets in the top sheet to capture the `37.2 mm` lower foot of standard Gridfinity bins, laminated onto a backing sheet with optional `6 × 2 mm` magnet holes.
  - **3-Layer Stepped Profile (`3.0 mm` Collar + `3.0 mm` Step Shelf + `1.5 mm` Base):** Replicates the stepped Gridfinity bevel in flat sheet stock by stacking a `41.7 mm` (`R3.85 mm`) upper collar over the `37.4 mm` lower shoulder shelf and backing plate.
  - **1-Layer Minimal Frame (`3.0 mm` Grid Only):** Ultralight single-sheet retainer grid (`37.4 mm` cutouts) that rests directly on a flat drawer floor or workbench mat.
- **Standard Grid & Drawer-Fit Sizing**
  - **Grid Units Mode:** Generate exact `42.0 mm` multiples from `1 × 1` up to `30 × 30` units.
  - **Drawer-Fit Mode:** Enter your interior drawer width and depth in millimeters (`mm`) or inches (`in`). GridCut calculates the maximum `42 mm` grid capacity and optionally fills the remaining perimeter slack with a symmetric flush border.
- **Laser Kerf Compensation & Live Toolpath Overlay**
  - Automatically offsets outer perimeters **outward** (`+kerf / 2`) and inner cell pockets, magnet holes, and screw holes **inward** (`-kerf / 2`) so physical parts measure true to spec after the laser beam burns away material.
  - Interactive **Toolpath Overlay** in the CAD viewport renders the kerf-compensated laser path (dashed centerline, beam swath, and pierce markers) directly on top of the nominal base geometry, with a switch between **8× Visual Offset** and **1× True Scale**.
- **Automatic Bed Splitting & Interlocking Joinery**
  - Supports presets for **K40 (`300 × 200 mm`)**, **Glowforge (`495 × 279 mm`)**, **Diode (`400 × 400 mm`)**, **CO₂ (`600 × 400 mm`)**, **Custom Bed**, or **Unlimited Single Piece**.
  - Oversized baseplates automatically subdivide along `42 mm` cell boundaries with **Interlocking Dovetail Puzzle Tabs** (or straight butt seams) and nest onto numbered sheets.
- **Hardware & Material Optimization**
  - **`6 × 2 mm` Neodymium Magnet Pockets:** Press-fit cutouts (`6.30 mm` default nominal diameter, `4.8 mm` corner inset, `26.0 mm` center-to-center).
  - **Skeletonized Backing Floor:** Optional `20 × 20 mm` (`R3.0 mm`) weight- and glue-relief windows in the bottom backing plate that preserve corner magnet bosses.
  - **M3 Corner Alignment Holes:** Precision registration holes placed at solid 4-way interior grid intersections across all layers so you can pin the stack with M3 screws or dowels during glue-up.
  - **Vector Part Labels:** Single-line engraved layer and tile IDs (`ENGRAVE_LABELS`) placed on solid web margins.
- **Save & Load JSON Presets**
  - Export your current drawer/baseplate setup as a `.json` preset file and reload it anytime to switch between different drawers, machines, or sheet materials.
- **True 1:1 Vector Export (`DXF` & `SVG`)**
  - **AutoCAD R2000 `LWPOLYLINE` DXF:** Uses `$INSUNITS = 4` (millimeters), true geometric arc bulges (`bulge = tan(θ/4)`), and color-coded layers (`CUT_OUTER`, `CUT_INNER`, `CUT_MAGNETS`, `CUT_SCREWS`, `ENGRAVE_LABELS`).
  - **1:1 Millimeter SVG:** Uses physical `width="...mm"` and `height="...mm"` attributes so LightBurn, Inkscape, Illustrator, and Glowforge import at exact scale without DPI scaling errors.
- **Interactive CAD Viewport & Dark Mode**
  - Inspect designs in **Stacked Blueprint**, **Cut Sheet Layout**, or **10:1 Cross-Section Fit** views with pan/zoom, layer toggles, a floating collapsible **Cut Manifest & Export** inspector, and automatic `prefers-color-scheme` dark mode with manual theme switching.

---

## How to Use

1. **Open the Generator:** Visit [https://gridcut-laser-cut-gridfinity-baseplate-generator.ai.studio](https://gridcut-laser-cut-gridfinity-baseplate-generator.ai.studio).
2. **Choose Dimensions:**
   - Select **Grid Units** to specify columns and rows directly (e.g., `4 × 3`), or select **Drawer Fit** to enter your internal drawer width and depth.
3. **Select Layer Stack & Material Thickness:**
   - Pick **2-Layer Standard**, **3-Layer Stepped Profile**, or **1-Layer Minimal Frame**, and enter the measured caliper thickness of your plywood, MDF, or acrylic sheets.
4. **Calibrate Beam Kerf & Clearance:**
   - Select a kerf preset (`0.10 mm` Diode, `0.15 mm` 3 mm Birch Ply, `0.20 mm` Acrylic) or dial in your exact beam kerf width. Toggle **Toolpath Overlay** in the viewport toolbar to inspect the outward/inward kerf compensation paths.
5. **Configure Hardware & Machine Bed:**
   - Enable/disable magnet pockets, skeletonized backing windows, M3 alignment holes, and engraved labels.
   - Choose your laser cutter bed size to automatically split and nest oversized plates.
6. **Export Vector Files:**
   - Click **Export DXF** in the top bar or use the floating **Cut Manifest & Export** panel to download combined sheets, individual bed sheets, or individual layer parts as `.dxf` or `.svg`.

---

## Recommended Material & Laser Settings

| Material | Recommended Stack | Typical Kerf (`mm`) | Notes |
| :--- | :--- | :--- | :--- |
| **3 mm Baltic Birch Plywood** | 2-Layer (`3 mm` + `3 mm`) or 3-Layer | `0.14 – 0.18 mm` | Mask surface with transfer tape to prevent smoke staining; laminate with wood glue or 3M 468MP adhesive transfer tape. |
| **3 mm Cast Acrylic (PMMA)** | 2-Layer (`3 mm` + `1.5 mm` / `3 mm`) | `0.18 – 0.22 mm` | High dimensional stability; bond layers with acrylic solvent cement or 3M 300LSE double-sided tape. |
| **3 mm Draftboard / MDF** | 2-Layer Standard | `0.15 – 0.20 mm` | Economical for shop drawers; seal edges or use medium CA glue + M3 alignment pins during assembly. |

### Vector Layer Color Convention

| Layer ID | Purpose | Color | ACI (DXF) | Recommended Laser Operation |
| :--- | :--- | :--- | :--- | :--- |
| `ENGRAVE_LABELS` | Part & tile ID text | Slate (`#475569`) | `8` | Cut **1st** — Low-power vector score / line mark |
| `CUT_SCREWS` | M3 alignment pin holes | Green (`#16A34A`) | `3` | Cut **2nd** — Inner through-cut (`-kerf/2`) |
| `CUT_MAGNETS` | `6 × 2 mm` magnet holes | Teal (`#0D9488`) | `4` | Cut **3rd** — Inner through-cut (`-kerf/2`) |
| `CUT_INNER` | Gridfinity cell cutouts | Blue (`#2563EB`) | `5` | Cut **4th** — Inner through-cut (`-kerf/2`) |
| `CUT_OUTER` | Outer plate & puzzle tabs | Red (`#DC2626`) | `1` | Cut **Last** — Outer perimeter through-cut (`+kerf/2`) |

---

## Local Development

### Prerequisites
- Node.js 20+ (or Bun)

### Setup & Run
```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev
```

### Run Unit Tests & Typecheck
```bash
# Run CAD geometry, kerf, DXF/SVG, and preset IO unit tests
npx tsx --test src/cad/generator.test.ts

# Run TypeScript typecheck
npm run lint

# Build production bundle
npm run build
```
