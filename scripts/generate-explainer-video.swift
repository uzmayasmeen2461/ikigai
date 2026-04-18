import AppKit
import AVFoundation

let outputURL = URL(fileURLWithPath: "public/ikigai-explainer.mp4")
try? FileManager.default.removeItem(at: outputURL)

let size = CGSize(width: 1280, height: 720)
let fps: Int32 = 2
let secondsPerSlide = 8

let slides: [(title: String, body: [String])] = [
    (
        "IKIGAI kya karta hai?",
        [
            "Small business, home business, restaurant aur cloud kitchen owners ke liye digital setup easy banata hai.",
            "Aap requirement share karte hain, IKIGAI task ko organize karta hai."
        ]
    ),
    (
        "Services jo IKIGAI provide karta hai",
        [
            "WhatsApp Business setup aur catalog",
            "Product listing across platforms",
            "Restaurant / cloud kitchen setup"
        ]
    ),
    (
        "Aur bhi digital setup",
        [
            "Social media business page setup",
            "Website ya online store setup",
            "Business ko professional online presence milti hai."
        ]
    ),
    (
        "Website kaise use karein?",
        [
            "Get Started par click kijiye.",
            "Account banaiye aur service select kijiye.",
            "Task title aur description likh kar submit kar dijiye."
        ]
    ),
    (
        "Task submit hone ke baad",
        [
            "IKIGAI task review karta hai.",
            "Work ko clear steps mein structure karta hai.",
            "Trained IKIGAI Partners ke through execution manage hota hai."
        ]
    ),
    (
        "Dashboard mein kya dikhega?",
        [
            "Task status",
            "Progress updates",
            "Latest notes aur completion details"
        ]
    ),
    (
        "Partners bhi join kar sakte hain",
        [
            "Agar aap flexible earning chahte hain, IKIGAI Partner ke roop mein join kar sakte hain.",
            "Aaj hi IKIGAI ke saath get started kijiye."
        ]
    )
]

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: Int(size.width),
    AVVideoHeightKey: Int(size.height),
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 2_500_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]

let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: Int(size.width),
        kCVPixelBufferHeightKey as String: Int(size.height)
    ]
)

writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func drawText(_ text: String, in rect: CGRect, font: NSFont, color: NSColor, alignment: NSTextAlignment = .left, lineHeight: CGFloat = 1.18) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineHeightMultiple = lineHeight

    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph
    ]

    text.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes)
}

func drawSlide(title: String, body: [String], index: Int) -> CVPixelBuffer {
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(
        kCFAllocatorDefault,
        Int(size.width),
        Int(size.height),
        kCVPixelFormatType_32ARGB,
        nil,
        &buffer
    )

    guard let pixelBuffer = buffer else {
        fatalError("Could not create pixel buffer")
    }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    )!

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)

    let bounds = CGRect(origin: .zero, size: size)
    NSColor(red: 0.008, green: 0.024, blue: 0.09, alpha: 1).setFill()
    bounds.fill()

    let bgGradient = NSGradient(colors: [
        NSColor(red: 0.02, green: 0.08, blue: 0.19, alpha: 1),
        NSColor(red: 0.03, green: 0.10, blue: 0.32, alpha: 1),
        NSColor(red: 0.12, green: 0.18, blue: 0.45, alpha: 1)
    ])!
    bgGradient.draw(in: bounds, angle: 32)

    NSColor(red: 0.20, green: 0.45, blue: 1, alpha: 0.22).setFill()
    NSBezierPath(ovalIn: CGRect(x: 110, y: 420, width: 520, height: 520)).fill()
    NSColor(red: 0.38, green: 0.34, blue: 1, alpha: 0.24).setFill()
    NSBezierPath(ovalIn: CGRect(x: 750, y: -160, width: 560, height: 560)).fill()

    let panel = NSBezierPath(roundedRect: CGRect(x: 64, y: 64, width: 1152, height: 592), xRadius: 34, yRadius: 34)
    NSColor.white.withAlphaComponent(0.08).setFill()
    panel.fill()
    NSColor.white.withAlphaComponent(0.14).setStroke()
    panel.lineWidth = 1.5
    panel.stroke()

    let badge = NSBezierPath(roundedRect: CGRect(x: 106, y: 570, width: 250, height: 44), xRadius: 22, yRadius: 22)
    NSColor.white.withAlphaComponent(0.12).setFill()
    badge.fill()
    drawText("IKIGAI EXPLAINER", in: CGRect(x: 132, y: 582, width: 210, height: 22), font: .systemFont(ofSize: 15, weight: .bold), color: NSColor(red: 0.75, green: 0.86, blue: 1, alpha: 1))

    let slideNumber = "\(index + 1)/\(slides.count)"
    let numberBadge = NSBezierPath(roundedRect: CGRect(x: 1088, y: 570, width: 86, height: 44), xRadius: 22, yRadius: 22)
    NSColor.white.withAlphaComponent(0.12).setFill()
    numberBadge.fill()
    drawText(slideNumber, in: CGRect(x: 1108, y: 582, width: 50, height: 22), font: .systemFont(ofSize: 16, weight: .bold), color: .white, alignment: .center)

    drawText(title, in: CGRect(x: 116, y: 390, width: 950, height: 130), font: .systemFont(ofSize: 58, weight: .bold), color: .white, lineHeight: 1.03)

    var y: CGFloat = 300
    for item in body {
        NSColor(red: 0.23, green: 0.49, blue: 1, alpha: 1).setFill()
        NSBezierPath(ovalIn: CGRect(x: 122, y: y + 11, width: 14, height: 14)).fill()
        drawText(item, in: CGRect(x: 158, y: y, width: 960, height: 56), font: .systemFont(ofSize: 29, weight: .medium), color: NSColor(red: 0.86, green: 0.90, blue: 0.96, alpha: 1), lineHeight: 1.12)
        y -= 76
    }

    drawText("Connecting Purpose with Productivity", in: CGRect(x: 116, y: 112, width: 500, height: 30), font: .systemFont(ofSize: 22, weight: .semibold), color: NSColor(red: 0.74, green: 0.82, blue: 0.92, alpha: 1))
    drawText("ikigai", in: CGRect(x: 988, y: 104, width: 185, height: 58), font: .systemFont(ofSize: 48, weight: .bold), color: .white, alignment: .right)

    NSGraphicsContext.restoreGraphicsState()
    CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
    return pixelBuffer
}

var frameIndex: Int64 = 0
for (index, slide) in slides.enumerated() {
    let buffer = drawSlide(title: slide.title, body: slide.body, index: index)
    for _ in 0..<(secondsPerSlide * Int(fps)) {
        while !input.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.01)
        }
        let time = CMTime(value: frameIndex, timescale: fps)
        adaptor.append(buffer, withPresentationTime: time)
        frameIndex += 1
    }
}

input.markAsFinished()
writer.finishWriting {
    if writer.status == .completed {
        print("Generated \(outputURL.path)")
    } else {
        print("Failed: \(writer.error?.localizedDescription ?? "Unknown error")")
        exit(1)
    }
}

RunLoop.current.run(until: Date().addingTimeInterval(2))
