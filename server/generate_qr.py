import sys
from qrcode import QRCode
from qrcode.constants import ERROR_CORRECT_M
from qrcode.image.svg import SvgImage
from qrcode.compat.etree import ET

value = sys.argv[1] if len(sys.argv) > 1 else ''
qr = QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=10, border=4, image_factory=SvgImage)
qr.add_data(value)
qr.make(fit=True)
image = qr.make_image()
# Fondo blanco explícito para que el QR sea legible tanto en pantalla como al imprimir.
ns = 'http://www.w3.org/2000/svg'
bg = ET.Element('{%s}rect' % ns, {
    'x': '0', 'y': '0',
    'width': image.units(image.pixel_size),
    'height': image.units(image.pixel_size),
    'fill': '#ffffff'
})
image._img.insert(0, bg)
sys.stdout.buffer.write(image.to_string(xml_declaration=True, encoding='utf-8'))
