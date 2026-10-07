from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "images"
BG = (225, 242, 234, 255)
GREEN = (55, 126, 101, 255)
CREAM = (255, 253, 246, 255)


def cubic(start, control1, control2, end, steps=24):
    points = []
    for index in range(steps + 1):
        t = index / steps
        inverse = 1 - t
        points.append((
            inverse**3 * start[0] + 3 * inverse**2 * t * control1[0] + 3 * inverse * t**2 * control2[0] + t**3 * end[0],
            inverse**3 * start[1] + 3 * inverse**2 * t * control1[1] + 3 * inverse * t**2 * control2[1] + t**3 * end[1],
        ))
    return points


def make_mark(size, monochrome=False):
    supersample = 4
    factor = size * supersample / 512
    mark_scale = 1.2
    canvas = Image.new("RGBA", (size * supersample, size * supersample), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    def transform(x, y):
        return (256 + (x - 256) * mark_scale, 256 + (y - 256) * mark_scale)

    def scaled_box(box):
        left, top = transform(box[0], box[1])
        right, bottom = transform(box[2], box[3])
        return tuple(round(value * factor) for value in (left, top, right, bottom))

    def rounded(box, radius, fill):
        draw.rounded_rectangle(scaled_box(box), radius=round(radius * factor * mark_scale), fill=fill)

    def doorway(fill):
        box = scaled_box((234, 300, 278, 373))
        radius = round(18 * factor * mark_scale)
        draw.rounded_rectangle(box, radius=radius, fill=fill)
        draw.rectangle((box[0], box[3] - radius, box[2], box[3]), fill=fill)

    def check_badge(fill, check):
        badge = scaled_box((321, 321, 389, 389))
        draw.ellipse(badge, fill=fill)
        points = [transform(333, 353), transform(349, 369), transform(378, 336)]
        points = [(round(x * factor), round(y * factor)) for x, y in points]
        width = round(8 * factor * mark_scale)
        draw.line(points, fill=check, width=width, joint="curve")
        radius = width / 2
        for x, y in (points[0], points[-1]):
            draw.ellipse((round(x - radius), round(y - radius), round(x + radius), round(y + radius)), fill=check)

    def house_body(fill):
        body = cubic((173, 278), (198, 250), (234, 211), (256, 211))
        body += cubic((256, 211), (278, 211), (314, 250), (339, 278))[1:]
        body.append((339, 354))
        body += cubic((339, 354), (339, 366), (330, 373), (318, 373))[1:]
        body.append((194, 373))
        body += cubic((194, 373), (182, 373), (173, 366), (173, 354))[1:]
        body.append((173, 278))
        draw.polygon([tuple(round(value * factor) for value in transform(x, y)) for x, y in body], fill=fill)

    roof = cubic((132, 270), (170, 235), (218, 158), (256, 158))
    roof += cubic((256, 158), (294, 158), (342, 235), (380, 270))[1:]
    roof = [tuple(round(value * factor) for value in transform(x, y)) for x, y in roof]
    roof_width = round(25 * factor * mark_scale)

    def draw_roof(fill):
        draw.line(roof, fill=fill, width=roof_width, joint="curve")
        radius = roof_width / 2
        for x, y in (roof[0], roof[-1]):
            draw.ellipse((round(x - radius), round(y - radius), round(x + radius), round(y + radius)), fill=fill)

    if monochrome:
        white, clear = (255, 255, 255, 255), (0, 0, 0, 0)
        draw_roof(white)
        rounded((310, 132, 331, 180), 5, white)
        house_body(white)
        doorway(clear)
        check_badge(white, clear)
    else:
        draw_roof(GREEN)
        rounded((310, 132, 331, 180), 5, GREEN)
        house_body(GREEN)
        doorway((0, 0, 0, 0))
        check_badge(CREAM, GREEN)

    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def main():
    IMAGES.mkdir(parents=True, exist_ok=True)

    icon = Image.new("RGBA", (1024, 1024), BG)
    icon.alpha_composite(make_mark(1024))
    icon.save(IMAGES / "icon.png")

    make_mark(512).save(IMAGES / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), BG).save(IMAGES / "android-icon-background.png")
    make_mark(432, monochrome=True).save(IMAGES / "android-icon-monochrome.png")

    splash = Image.new("RGBA", (800, 800), (0, 0, 0, 0))
    splash.alpha_composite(make_mark(560), (120, 0))
    draw = ImageDraw.Draw(splash)
    font = ImageFont.truetype("/System/Library/Fonts/AppleSDGothicNeo.ttc", 50, index=6)
    label = "내 차례"
    bounds = draw.textbbox((0, 0), label, font=font)
    draw.text(((800 - bounds[2] + bounds[0]) / 2, 560), label, font=font, fill=GREEN)
    splash.save(IMAGES / "splash-icon.png")

    icon.resize((64, 64), Image.Resampling.LANCZOS).save(IMAGES / "favicon.png")


if __name__ == "__main__":
    main()
