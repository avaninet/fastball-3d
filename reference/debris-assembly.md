# Dodgeball debris assembly

Dimensions are in metres. Both objects use the station X (radial), Y (along-track), and Z (orbit-normal) axes. Positions below refer to their centres at separation. In Orbital flight, each centre follows its own orbital coast. Both pieces retain their orientation in station coordinates.

| Piece | Initial XYZ (m) | Initial velocity XYZ (m/s) | Dimensions |
| --- | --- | --- | --- |
| Service cover | 5.745, −13.893, −1.026 | +0.08437, −0.09644, +0.11298 | 1.86 wide × 1.02 high × 0.17 thick |
| Bent equipment frame | 13.476, −2.030, 5.822 | −0.02001, −0.03837, +0.03659 | 1.89 wide × 1.44 high × 0.34 thick |

The cover is a closed box. Its local X axis tips 0.10 radians toward +Z. Stiffeners, handle markings and latches are surface decoration within the cover perimeter.

## Frame joints

The frame is a U-channel with one bent upright. The two broad skins lie at Y = ±0.17. Both use the same eight-point X/Z perimeter. These vertices run around the outside and back through the opening.

| Vertex | X | Z | Feature |
| --- | ---: | ---: | --- |
| A | −0.960 | −0.72 | Outer left heel |
| B | +0.930 | −0.72 | Outer right heel |
| C | +0.700 | +0.72 | Outer bent tip |
| D | +0.440 | +0.72 | Inner bent tip |
| E | +0.625 | −0.44 | Right inside corner |
| F | −0.700 | −0.44 | Left inside corner |
| G | −0.700 | +0.72 | Inner straight tip |
| H | −0.960 | +0.72 | Outer straight tip |

The sill between Z = −0.72 and −0.44 runs through both heels. The uprights join it across their full width at Z = −0.44. Between F and E the exposed top of the sill is 1.325 m wide. Each perimeter edge connects the two skins with one wall. A single skin spans each joint, so no internal end faces or overlapping seams appear at a heel.

Each piece has one enclosing rectangular prism in its own axes. Each face lies 4 cm past the outermost metal on that side. The cover box measures 1.94 × 1.10 × 0.25 m in width, height and depth. The frame box measures 1.97 × 1.52 × 0.42 m and spans the open middle. The contact solver tests the suit's 0.45 m radius against the nearest point on this box. When the coast predicts contact, each camera draws the box's visible silhouette in amber and the folds between visible faces in fine translucent dashes. A blue cross and countdown identify the future point of contact. The hypothetical throw uses a violet cross.
