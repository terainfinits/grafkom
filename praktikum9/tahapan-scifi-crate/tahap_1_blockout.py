"""
Sci-Fi Crate - Praktikum Grafika Komputer Pertemuan 9
Cara pakai: Blender > workspace Scripting > Open file ini > Run Script (Alt+P).
Script aman dijalankan berulang: collection SciFi_Crate lama dihapus dulu.

STAGE menentukan sampai tahap mana model dibangun (tiap tahap menumpuk):
  1 = Primitive / Blockout
  2 = Loop Cut + Bevel
  3 = Extrude + Inset
  4 = Modifier (termasuk detail berulang vent dan baut)
  5 = Final asset (label + inspeksi akhir)
Loop Cut dikerjakan sebelum Inset karena area panel dibatasi oleh loop tersebut.
"""

from math import radians

import bmesh
import bpy
from mathutils import Matrix, Vector

STAGE = 1
LOOPCUT_BEVEL = STAGE >= 2
EXTRUDE_INSET = STAGE >= 3
MODIFIERS = STAGE >= 4
FINAL = STAGE >= 5

COLLECTION = "SciFi_Crate"
AXIS_EPS = 0.99  # batas dot product untuk mengenali arah normal face


# ---------------------------------------------------------------- Scene


def reset_collection():
    old = bpy.data.collections.get(COLLECTION)
    if old:
        for obj in list(old.objects):
            mesh = obj.data
            bpy.data.objects.remove(obj)
            if mesh and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(COLLECTION)
    bpy.context.scene.collection.children.link(col)
    return col


def new_object(name, mesh, col, parent):
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    obj.parent = parent
    return obj


def apply_scale(obj):
    """Setara Ctrl+A > Scale: bentuk tetap, scale object kembali (1,1,1)."""
    obj.data.transform(Matrix.Diagonal((*obj.scale, 1.0)))
    obj.scale = (1, 1, 1)


# ---------------------------------------------------------------- Operasi mesh


def loop_cut(bm, co, no):
    """Setara Ctrl+R: menambah edge loop pada bidang tertentu."""
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=co, plane_no=no)


def find_face(bm, normal, x=None, y=None, z=None):
    """Cari face menghadap `normal` yang pusatnya paling dekat ke x/y/z."""
    normal = Vector(normal)
    bm.normal_update()
    faces = [f for f in bm.faces if f.normal.dot(normal) > AXIS_EPS]

    def dist(f):
        c = f.calc_center_median()
        return sum(abs(c[i] - t) for i, t in enumerate((x, y, z)) if t is not None)

    return min(faces, key=dist)


def extrude_face(bm, face, depth):
    """Setara E: depth positif ke luar, negatif ke dalam."""
    offset = face.normal.copy() * depth
    new = bmesh.ops.extrude_discrete_faces(bm, faces=[face])["faces"][0]
    bmesh.ops.translate(bm, vec=offset, verts=new.verts[:])
    return new


def inset_extrude(bm, face, thickness, depth):
    """Setara I lalu E: panel recessed (depth < 0) atau raised (depth > 0)."""
    bmesh.ops.inset_individual(bm, faces=[face], thickness=thickness, depth=0.0)
    return extrude_face(bm, face, depth)


def bevel_edges(bm, edges, offset, segments=1):
    """Setara Ctrl+B (destructive)."""
    bmesh.ops.bevel(
        bm, geom=edges, offset=offset, offset_type="OFFSET",
        segments=segments, profile=0.5, affect="EDGES",
    )


def finish_mesh(bm, mesh):
    """Cleanup: Merge by Distance + Recalculate Normal (M, Shift+N)."""
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def boxed_bmesh(lo, hi):
    """Primitive cube dari titik min ke max (posisi numerik yang presisi)."""
    bm = bmesh.new()
    verts = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    lo, hi = Vector(lo), Vector(hi)
    size = hi - lo
    center = (lo + hi) / 2
    for v in verts:
        v.co = center + Matrix.Diagonal(size) @ v.co
    return bm


# ---------------------------------------------------------------- Modifier


def add_bevel(obj, width, segments=2):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = radians(50)


def add_mirror(obj, x=True, y=False, z=False):
    mod = obj.modifiers.new("Mirror", "MIRROR")
    mod.use_axis = (x, y, z)


def add_array(obj, count, offset):
    mod = obj.modifiers.new("Array", "ARRAY")
    mod.count = count
    mod.use_relative_offset = False
    mod.use_constant_offset = True
    mod.constant_offset_displace = offset


def add_solidify(obj, thickness):
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 0


# ---------------------------------------------------------------- Komponen


def build_body(col, root):
    # Primitive -> Object Mode scale -> Apply Scale (S X 2, S Y 1.5, S Z 1.2)
    mesh = bpy.data.meshes.new("Crate_Body")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bm.to_mesh(mesh)
    bm.free()
    obj = new_object("Crate_Body", mesh, col, root)
    obj.scale = (2.0, 1.5, 1.2)
    apply_scale(obj)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    if LOOPCUT_BEVEL:
        # Chamfer empat rusuk vertikal agar silhouette tidak kotak polos
        corners = [
            e for e in bm.edges
            if abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-5
            and abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-5
        ]
        bevel_edges(bm, corners, 0.08)

        # Dua loop cut membagi muka depan/atas/belakang menjadi tiga area
        loop_cut(bm, (-0.65, 0, 0), (1, 0, 0))
        loop_cut(bm, (0.65, 0, 0), (1, 0, 0))

    if EXTRUDE_INSET:
        # Advanced paneling depan dan belakang
        for ny in (-1, 1):
            normal = (0, ny, 0)
            inset_extrude(bm, find_face(bm, normal, x=-1.28), 0.2, -0.08)
            inset_extrude(bm, find_face(bm, normal, x=1.28), 0.2, -0.08)
            center = inset_extrude(bm, find_face(bm, normal, x=0.0), 0.12, -0.06)
            inset_extrude(bm, center, 0.1, 0.04)

        # Hatch atas: raised lalu recessed
        hatch = inset_extrude(bm, find_face(bm, (0, 0, 1), x=0.0), 0.2, 0.06)
        inset_extrude(bm, hatch, 0.08, -0.03)
    finish_mesh(bm, mesh)
    if MODIFIERS:
        add_bevel(obj, 0.02)
    return obj


def build_side_panel(col, root):
    # Dimodelkan di sisi -X; origin di pusat crate supaya Mirror X tepat
    bm = boxed_bmesh((-2.12, -1.1, -0.8), (-1.98, 1.1, 0.8))
    if EXTRUDE_INSET:
        inset_extrude(bm, find_face(bm, (-1, 0, 0)), 0.2, -0.04)
    mesh = bpy.data.meshes.new("Side_Panel")
    finish_mesh(bm, mesh)
    obj = new_object("Side_Panel", mesh, col, root)
    if MODIFIERS:
        add_mirror(obj)
        add_bevel(obj, 0.015)
    return obj


def build_handle(col, root):
    # Satu batang: loop cut memisahkan ujung, ujung di-extrude jadi kaki
    bm = boxed_bmesh((-2.47, -0.7, -0.05), (-2.37, 0.7, 0.05))
    loop_cut(bm, (0, -0.6, 0), (0, 1, 0))
    loop_cut(bm, (0, 0.6, 0), (0, 1, 0))
    for y in (-0.65, 0.65):
        extrude_face(bm, find_face(bm, (1, 0, 0), y=y), 0.31)
    mesh = bpy.data.meshes.new("Handle")
    finish_mesh(bm, mesh)
    obj = new_object("Handle", mesh, col, root)
    if MODIFIERS:
        add_mirror(obj)
        add_bevel(obj, 0.012)
    return obj


def build_corner_guard(col, root):
    bm = boxed_bmesh((1.8, 1.25, 0.95), (2.05, 1.55, 1.25))
    mesh = bpy.data.meshes.new("Corner_Guard")
    finish_mesh(bm, mesh)
    obj = new_object("Corner_Guard", mesh, col, root)
    if MODIFIERS:
        add_mirror(obj, True, True, True)  # 1 mesh -> 8 sudut
        add_bevel(obj, 0.025)
    return obj


def build_vent(col, root):
    bm = boxed_bmesh((-1.635, -1.46, -0.72), (-0.935, -1.4, -0.66))
    mesh = bpy.data.meshes.new("Detail_Vent")
    finish_mesh(bm, mesh)
    obj = new_object("Detail_Vent", mesh, col, root)
    if MODIFIERS:
        add_array(obj, 6, (0, 0, 0.276))
        add_mirror(obj)  # Array dulu, baru Mirror ke panel kanan
        add_bevel(obj, 0.008, 1)
    return obj


def build_bolts(col, root):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, segments=8, radius1=0.06, radius2=0.06, depth=0.05,
        matrix=Matrix.Translation((-1.3, -1.0, 1.215)),
    )
    mesh = bpy.data.meshes.new("Detail_Bolts")
    finish_mesh(bm, mesh)
    obj = new_object("Detail_Bolts", mesh, col, root)
    if MODIFIERS:
        add_array(obj, 3, (0, 1.0, 0))
        add_mirror(obj)
    return obj


def build_label_plate(col, root):
    # Plane segi enam untuk Solidify; ketebalan hanya muncul lewat modifier
    bm = bmesh.new()
    coords = [
        (-0.2, 0.3), (0.2, 0.3), (0.3, 0.2), (0.3, -0.3), (-0.2, -0.3), (-0.3, -0.2),
    ]
    verts = [bm.verts.new((x, -1.485, z)) for x, z in coords]
    bm.faces.new(verts)
    mesh = bpy.data.meshes.new("Detail_Label")
    finish_mesh(bm, mesh)
    obj = new_object("Detail_Label", mesh, col, root)
    if MODIFIERS:
        add_solidify(obj, 0.02)
    return obj


# ---------------------------------------------------------------- Laporan


def report(col):
    print(f"\n=== {COLLECTION} [{STAGE}] ===")
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in sorted(col.objects, key=lambda o: o.name):
        if obj.type != "MESH":
            continue
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        open_edges = sum(not e.is_manifold for e in bm.edges)
        bm.free()
        evaluated = obj.evaluated_get(depsgraph).to_mesh()
        print(
            f"{obj.name:14} scale={tuple(obj.scale)} "
            f"faces={len(obj.data.polygons)} -> {len(evaluated.polygons)} "
            f"non_manifold_edges={open_edges} "
            f"mods={[m.type for m in obj.modifiers]}"
        )
        obj.evaluated_get(depsgraph).to_mesh_clear()


def main():
    col = reset_collection()
    root = bpy.data.objects.new(COLLECTION + "_Root", None)
    col.objects.link(root)

    build_body(col, root)
    build_side_panel(col, root)
    build_corner_guard(col, root)
    if EXTRUDE_INSET:
        build_handle(col, root)
    if MODIFIERS:
        build_vent(col, root)
        build_bolts(col, root)
    if FINAL:
        build_label_plate(col, root)

    bpy.context.view_layer.update()
    report(col)


if __name__ == "__main__":
    main()
