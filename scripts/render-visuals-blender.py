import bpy
import math
import random
from mathutils import Vector
from pathlib import Path

OUT = Path("output/motion")
OUT.mkdir(parents=True, exist_ok=True)
W, H, FPS, FRAMES = 720, 1280, 24, 72

def mat(name, color, rough=0.82, emission=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = rough
    if emission:
        bs.inputs["Emission Color"].default_value = (*color, 1)
        bs.inputs["Emission Strength"].default_value = emission
    return m

NIGHT = mat("blue black night", (0.006, 0.014, 0.019))
BARK = mat("wet tree bark", (0.025, 0.035, 0.029))
LEAF = [mat("canopy deep "+str(i), c) for i,c in enumerate([(0.012,0.035,0.025),(0.018,0.045,0.031),(0.025,0.052,0.036)])]
ROAD = mat("mud road", (0.055,0.047,0.038))
SKIN = mat("warm skin shadow", (0.12,0.075,0.055))
CLOTH = mat("Arya charcoal jacket", (0.035,0.047,0.052))
PINK = mat("Nita muted maroon", (0.16,0.045,0.065))
OLIVE = mat("old woman shawl", (0.12,0.13,0.07))
HAIR = mat("black hair", (0.004,0.005,0.006))
METAL = mat("motorcycle dark metal", (0.012,0.018,0.02), 0.35)
RUBBER = mat("rubber", (0.004,0.005,0.006), 0.95)
GLOW = mat("lantern warm emission", (1.0,0.48,0.12), 0.3, 3.0)

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass

def cube(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new("soft worn edges","BEVEL"); mod.width=bevel; mod.segments=2
    return o

def uv(name, loc, scale, material, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o

def cyl(name, a, b, radius, material, vertices=12):
    mid=(Vector(a)+Vector(b))/2; direction=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=mid)
    o=bpy.context.object; o.name=name; o.rotation_mode="QUATERNION"; o.rotation_quaternion=direction.to_track_quat("Z","Y")
    o.data.materials.append(material); return o

def cone_between(name, a, b, r1, r2, material):
    mid=(Vector(a)+Vector(b))/2; direction=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=r1, radius2=r2, depth=direction.length, location=mid)
    o=bpy.context.object; o.name=name; o.rotation_mode="QUATERNION"; o.rotation_quaternion=direction.to_track_quat("Z","Y")
    o.data.materials.append(material); return o

def tree(x, y, height=8, seed=1):
    rng=random.Random(seed); base=(x,y,0)
    cyl("old banyan trunk",base,(x+0.2,y,height*0.72),0.42,BARK,16)
    for j in range(6):
        ang=j*math.tau/6+rng.uniform(-.2,.2)
        end=(x+math.cos(ang)*rng.uniform(1.3,2.6),y+math.sin(ang)*1.5,height*rng.uniform(.58,.86))
        cyl("crooked branch",(x,y,height*.48),end,.13,BARK,10)
        uv("dense leaf cluster",end,(rng.uniform(1.0,1.8),rng.uniform(.8,1.5),rng.uniform(.7,1.2)),rng.choice(LEAF))
    for j in range(9):
        xx=x+rng.uniform(-3.4,3.4); yy=y+rng.uniform(-1.8,1.8); z=height*rng.uniform(.63,1.03)
        uv("canopy foliage",(xx,yy,z),(rng.uniform(.8,1.5),rng.uniform(.7,1.3),rng.uniform(.7,1.3)),rng.choice(LEAF))

def person(name, x, y, z=0, coat=CLOTH, pregnant=False, long_hair=False, scale=1.0):
    # Built as a consistent reusable stylized 3D character silhouette.
    uv(name+" head",(x,y,z+2.55*scale),(.34*scale,.31*scale,.39*scale),SKIN)
    uv(name+" hair",(x,y+.035,z+2.77*scale),(.37*scale,.34*scale,.27*scale),HAIR)
    if long_hair:
        uv(name+" long hair",(x,y+.09,z+2.25*scale),(.39*scale,.32*scale,.75*scale),HAIR)
    cone_between(name+" torso",(x,y,z+1.0*scale),(x,y,z+2.28*scale),.44*scale,.29*scale,coat)
    if pregnant:
        uv(name+" belly",(x,y-.22*scale,z+1.47*scale),(.57*scale,.48*scale,.56*scale),coat)
    for side in (-1,1):
        cyl(name+" leg",(x+side*.19*scale,y,z+.12*scale),(x+side*.18*scale,y,z+1.08*scale),.13*scale,HAIR)
        cyl(name+" arm",(x+side*.31*scale,y,z+2.0*scale),(x+side*.48*scale,y-.04,z+1.25*scale),.105*scale,coat)
    return None

def motorcycle(x,y,z=0,scale=1):
    for wx in (-.85,.85):
        bpy.ops.mesh.primitive_torus_add(major_radius=.42*scale,minor_radius=.095*scale,major_segments=24,minor_segments=8,location=(x+wx*scale,y,z+.48*scale),rotation=(math.pi/2,0,0))
        bpy.context.object.name="motorcycle rubber wheel"; bpy.context.object.data.materials.append(RUBBER)
        cyl("wheel hub",(x+wx*scale,y-.08,z+.48*scale),(x+wx*scale,y+.08,z+.48*scale),.09*scale,METAL)
    cyl("motorcycle frame",(x-.85*scale,y,z+.48*scale),(x+.65*scale,y,z+.58*scale),.075*scale,METAL)
    cyl("motorcycle frame",(x-.15*scale,y,z+.48*scale),(x+.25*scale,y,z+1.05*scale),.065*scale,METAL)
    uv("fuel tank",(x+.05*scale,y,z+.88*scale),(.48*scale,.28*scale,.23*scale),METAL)
    cyl("handle bar",(x+.62*scale,y-.3*scale,z+1.08*scale),(x+.62*scale,y+.3*scale,z+1.08*scale),.045*scale,METAL)
    uv("headlight",(x+.87*scale,y,z+.94*scale),(.13*scale,.13*scale,.13*scale),GLOW)

def camera_and_lights(target=(0,0,3.5)):
    bpy.ops.object.camera_add(location=(0,-18,7.3))
    cam=bpy.context.object; cam.name="cinematic vertical camera"
    direction=Vector(target)-cam.location
    cam.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
    cam.data.lens=42; cam.data.dof.use_dof=True; cam.data.dof.focus_distance=18; cam.data.dof.aperture_fstop=3.2
    bpy.context.scene.camera=cam
    bpy.ops.object.light_add(type="AREA", location=(0,-7,9))
    key=bpy.context.object; key.data.energy=950; key.data.shape="DISK"; key.data.size=8
    key.rotation_euler=(math.radians(22),0,0)
    bpy.ops.object.light_add(type="POINT", location=(3,-2,3))
    fill=bpy.context.object; fill.data.energy=85; fill.data.color=(1.0,.43,.19); fill.data.shadow_soft_size=2
    bpy.ops.object.light_add(type="AREA", location=(-5,3,8))
    rim=bpy.context.object; rim.data.energy=700; rim.data.color=(.18,.35,.42); rim.data.size=5
    rim.rotation_euler=(math.radians(35),0,math.radians(25))

def make_environment(index):
    cube("wet earth ground",(0,0,-.22),(22,30,.4),ROAD)
    # Deep layered trees and fog banks create depth in the vertical frame.
    for j,x in enumerate((-7,-5,5,7)):
        tree(x,3+(j%2)*2,7.5+(j%3),index*11+j)
    for j in range(7):
        uv("low drifting mist",(random.Random(index*100+j).uniform(-7,7),random.Random(j+index).uniform(-1,9),random.Random(j+index*3).uniform(.35,1.3)),
           (random.uniform(1.0,2.5),.55,.35),mat("mist "+str(index)+" "+str(j),(.10,.14,.15),1,0.12))

def build_shot(index):
    clear_scene(); random.seed(index*77)
    make_environment(index)
    if index == 1:
        cube("bus window",(0,2,4),(10,.25,5),mat("bus interior",(.018,.035,.042)))
        person("Arya",-.8,-1,0,CLOTH,scale=1.1); person("Nita",1,-1,0,PINK,True,scale=1.1)
    elif index == 2:
        person("Arya",-1,-1,0,CLOTH,scale=1.0); person("Kang Basir",1.2,0,0,OLIVE,scale=1.08); motorcycle(2,-.5,0,.75)
    elif index in (3,5):
        motorcycle(-.3,-1,0,.9); person("Arya",-.55,-.7,.8,CLOTH,scale=.68); person("Nita",.12,-.72,.82,PINK,True,scale=.62)
        if index==3: person("unknown long-haired rider",2.4,1,0,HAIR,long_hair=True,scale=1.05)
        else:
            motorcycle(2.4,2,0,.65); person("unknown long-haired rider",2.2,1.8,.5,HAIR,long_hair=True,scale=.6)
    elif index == 4:
        motorcycle(0,-1,0,1.1); person("Kang Basir",-.15,-.8,.8,OLIVE,scale=.65); person("Arya",.3,-.8,.85,CLOTH,scale=.62)
    elif index in (6,7):
        tree(0,2,10,index)
        person("elderly woman",-2,-.8,0,OLIVE,scale=.92)
        uv("flashlight lens",(-1.55,-1.1,1.25),(.12,.12,.12),GLOW)
        if index==7:
            # Only the enormous hairy legs and feet are revealed behind the trunk.
            for sx in (-.72,.82):
                cone_between("giant shadow leg",(sx,2.0,2.4),(sx+.1,2.1,7.1),.42,.7,HAIR)
                uv("giant foot",(sx,1.45,2.2),(.85,.95,.42),HAIR)
    else:
        motorcycle(0,-1,0,1.0); person("Arya",-.25,-.8,.8,CLOTH,scale=.65)
        tree(3,2,9,index)
    # Slow push-in and restrained moving light: no frozen still-frame scenes.
    bpy.ops.object.camera_add(location=(0,-18,7.3))
    cam=bpy.context.object; cam.name="animated camera"
    target=Vector((0,0,3.6)); cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.lens=42; bpy.context.scene.camera=cam
    cam.location.x=-.18; cam.keyframe_insert(data_path="location",frame=1)
    cam.location.x=.18; cam.keyframe_insert(data_path="location",frame=FRAMES)
    cam.data.lens=40; cam.data.keyframe_insert(data_path="lens",frame=1)
    cam.data.lens=46; cam.data.keyframe_insert(data_path="lens",frame=FRAMES)
    bpy.ops.object.light_add(type="AREA", location=(-3,-6,8))
    key=bpy.context.object; key.data.energy=900; key.data.shape="DISK"; key.data.size=7
    key.rotation_euler=(math.radians(25),0,0)
    key.data.energy=750; key.data.keyframe_insert(data_path="energy",frame=1)
    key.data.energy=1050; key.data.keyframe_insert(data_path="energy",frame=FRAMES)
    bpy.ops.object.light_add(type="POINT", location=(2,-2,2.2))
    fill=bpy.context.object; fill.data.energy=65; fill.data.color=(1,.38,.15); fill.data.shadow_soft_size=2
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE"
    scene.eevee.taa_render_samples=16
    scene.render.resolution_x=W; scene.render.resolution_y=H; scene.render.resolution_percentage=100
    scene.render.fps=FPS; scene.frame_start=1; scene.frame_end=FRAMES
    scene.world.color=(.006,.01,.016)
    scene.view_settings.view_transform="Standard"
    scene.view_settings.look="Medium High Contrast"
    scene.view_settings.exposure=0; scene.view_settings.gamma=1
    scene.render.image_settings.file_format="FFMPEG"
    scene.render.ffmpeg.format="MPEG4"; scene.render.ffmpeg.codec="H264"
    scene.render.ffmpeg.constant_rate_factor="MEDIUM"; scene.render.ffmpeg.ffmpeg_preset="GOOD"
    scene.render.filepath=str((OUT/f"scene-{index:02d}.mp4").resolve())
    scene.frame_set(1)
    bpy.ops.render.render(animation=True)
    print("Rendered Blender 3D shot",index,flush=True)

for shot in range(1,9):
    build_shot(shot)
