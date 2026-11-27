# Station assembly

The station is a rigid, 28-part assembly. Coordinates and dimensions below are in metres in the station frame. X is radial, Y is along-track, and Z is orbit-normal. The hull runs along Z. Blue solar arrays extend to both sides along X. The gold hatch faces −Y. Two amber bands identify the +Z end.

The executable dimensions, surface materials and grouping live in [station.js](../src/station.js). Each solid supplies the polygons used to draw it and the planes used to retire or hide a thrown tool.

## Axial stack

All six sections share the centerline X = Y = 0. Hull widths below are measured between opposite flat faces. Twelve facets put a flat attachment surface at each of ±X and ±Y.

| Part | Z interval | Width across flats | Attachments |
| --- | --- | ---: | --- |
| Lower hull | −5.55 to −1.72 | 1.48 | Two solar trusses at Z = −3.75, lower collar at +Z end |
| Lower collar | −1.72 to −1.50 | 1.16 | Lower hull to core |
| Core hull | −1.50 to +1.50 | 2.24 | Radiator sockets on ±X, hatch mount on −Y, collar at each end |
| Upper collar | +1.50 to +1.72 | 1.28 | Core to upper hull |
| Upper hull | +1.72 to +5.55 | 1.64 | Two solar trusses at Z = +3.75, marked end at +Z |
| Marked end | +5.55 to +6.40 | 1.06 | Seats directly on upper hull |

## Lateral assemblies

Each row describes a solid on both the +X and −X sides. The X interval gives distance from the centerline. Its inner end seats on the previous part’s outer face. All are centered at Y = 0. The four solar arms are centered at Z = ±3.75. The two radiator arms are centered at Z = 0.

| Part | Distance along X | Y thickness | Z height | Inboard attachment |
| --- | --- | ---: | ---: | --- |
| Lower solar truss | 0.74 to 1.60 | 0.22 | 0.20 | Lower hull flat |
| Upper solar truss | 0.82 to 1.60 | 0.22 | 0.20 | Upper hull flat |
| Solar hinge | 1.60 to 1.82 | 0.30 | 0.34 | Truss |
| Solar array | 1.82 to 6.70 | 0.148 | 3.50 | Hinge at inner panel edge |
| Radiator socket | 1.12 to 1.36 | 0.40 | 0.62 | Core flat |
| Service housing | 1.36 to 2.16 | 0.92 | 1.12 | Socket |
| Radiator boom | 2.16 to 2.95 | 0.24 | 0.24 | Housing |
| Radiator panel | 2.95 to 6.70 | 0.148 | 1.55 | Boom at inner panel edge |

The hatch and mount share X = 0 and Z = +0.28. The mount spans Y = −1.32 to −1.12 and measures 0.42 × 0.48 in X and Z. The hatch spans Y = −1.54 to −1.32 and measures 1.12 × 0.86 in X and Z. The narrow mount fits on the core’s flat face. The wider hatch clears the curved sides.

## Visibility and checks

Parts meet face to face. The axial stack separates into Z intervals, the lateral assemblies separate along X, and the core and hatch separate along Y. For either camera, the renderer paints the far interval first on each side of the eye. Each convex part then contributes its camera-facing surfaces. Rings, stripes and panel lines draw with their parent surface so a nearer component covers them together.

The mint grab envelope measures 14 × 3.2 × 14 m in the station's local axes. In the standard pose its thin axis points along track (Y). Random station orientation rotates the model and grab volume together. Pose version 1 applies a 15° or 30° rotation about X, then about fixed-frame Z, including single-axis poses. Camera roll, orbital dynamics, tool impulses and debris trajectories use the original orbital axes. Open gaps remain usable for capture. Tool sprites pass through those gaps unless their trajectory crosses a solid.

When changing a mount, update both mating faces and the dimensional table. Run `node tests/station.cjs` to check contact across every joint and containment within the grab envelope. The browser suite also checks the painted surfaces against independent depth samples in both visors.
