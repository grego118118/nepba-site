import {
    AbsoluteFill,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from "remotion";

export const MyComposition: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Spring animation for the logo
    const logoScale = spring({
        frame,
        fps,
        config: {
            damping: 200,
        },
    });

    // Fade in the text
    const textOpacity = interpolate(frame, [30, 60], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Slide in the text
    const textTranslateY = interpolate(frame, [30, 60], [50, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: "system-ui, sans-serif",
            }}
        >
            {/* Animated Logo/Icon */}
            <div
                style={{
                    transform: `scale(${logoScale})`,
                    marginBottom: 40,
                }}
            >
                <div
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        boxShadow: "0 20px 60px rgba(233, 69, 96, 0.4)",
                    }}
                >
                    <span style={{ fontSize: 60, color: "white" }}>▶</span>
                </div>
            </div>

            {/* Animated Text */}
            <div
                style={{
                    opacity: textOpacity,
                    transform: `translateY(${textTranslateY}px)`,
                    textAlign: "center",
                }}
            >
                <h1
                    style={{
                        color: "white",
                        fontSize: 72,
                        fontWeight: 700,
                        margin: 0,
                        letterSpacing: -2,
                    }}
                >
                    Welcome to Remotion
                </h1>
                <p
                    style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: 28,
                        marginTop: 20,
                        fontWeight: 400,
                    }}
                >
                    Create videos programmatically with React
                </p>
            </div>
        </AbsoluteFill>
    );
};
