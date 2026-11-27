package uz.asakaziyo.app.ui.theme

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Global Reduced Motion & Low-Power Mode flag respected by all ASAKA ZIYO animations.
 */
val LocalReducedMotion = staticCompositionLocalOf { false }

object AsakaMotion {
    fun <T> gentleSpring() = spring<T>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessLow
    )

    fun <T> snappySpring() = spring<T>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMedium
    )

    fun <T> liquidGlassSpring() = spring<T>(
        dampingRatio = 0.68f,
        stiffness = Spring.StiffnessMediumLow
    )
}

/**
 * Apple VisionOS / iOS 26 Style Liquid Glass Card with:
 * - Multi-layer translucent frosted surface
 * - Top-edge specular light refraction rim
 * - 3D spatial perspective press depth (`graphicsLayer` cameraDistance + rotationX + spring scale)
 * - Luminous Champagne Gold / Emerald border
 */
@Composable
fun AsakaGlassCard(
    modifier: Modifier = Modifier,
    elevated: Boolean = false,
    cornerRadius: Dp = 24.dp,
    borderColor: Color? = null,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val palette = LocalAsakaColors.current
    val haptics = LocalHapticFeedback.current
    val reducedMotion = LocalReducedMotion.current
    val density = LocalDensity.current.density
    val shape = RoundedCornerShape(cornerRadius)
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val pressScale by animateFloatAsState(
        targetValue = if (isPressed && onClick != null && !reducedMotion) 0.972f else 1f,
        animationSpec = AsakaMotion.liquidGlassSpring(),
        label = "liquid_scale"
    )
    val tiltX by animateFloatAsState(
        targetValue = if (isPressed && onClick != null && !reducedMotion) 3.5f else 0f,
        animationSpec = AsakaMotion.liquidGlassSpring(),
        label = "liquid_tilt_x"
    )

    val bg = if (elevated) palette.glassSurfaceElevated else palette.glassSurface
    val specularBorder = Brush.linearGradient(
        colors = listOf(
            (borderColor ?: Color.White).copy(alpha = if (palette.isDark) 0.32f else 0.72f),
            (borderColor ?: palette.goldAccent).copy(alpha = if (palette.isDark) 0.24f else 0.30f),
            Color.White.copy(alpha = if (palette.isDark) 0.06f else 0.20f)
        ),
        start = Offset(0f, 0f),
        end = Offset(600f, 400f)
    )

    Surface(
        modifier = modifier
            .graphicsLayer {
                scaleX = pressScale
                scaleY = pressScale
                rotationX = tiltX
                cameraDistance = 14f * density
            }
            .clip(shape)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = interactionSource,
                        indication = null
                    ) {
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onClick()
                    }
                } else Modifier
            ),
        shape = shape,
        color = bg,
        border = BorderStroke(1.dp, specularBorder),
        shadowElevation = if (elevated) 10.dp else 3.dp
    ) {
        Box(
            modifier = Modifier
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.White.copy(alpha = if (palette.isDark) 0.11f else 0.58f),
                            Color.White.copy(alpha = if (palette.isDark) 0.03f else 0.18f),
                            palette.goldAccent.copy(alpha = if (elevated) 0.05f else 0.015f)
                        )
                    )
                )
                .padding(16.dp),
            content = content
        )
    }
}

/**
 * Apple-style 3D Spatial Ambient Light Orbs rendered behind the root Canvas for true Liquid Glass depth.
 */
@Composable
fun Asaka3DSpatialAuraBackdrop(modifier: Modifier = Modifier) {
    val palette = LocalAsakaColors.current
    val reducedMotion = LocalReducedMotion.current
    val transition = rememberInfiniteTransition(label = "spatial_aura")

    val drift by if (reducedMotion) {
        remember { androidx.compose.runtime.mutableFloatStateOf(0f) }
    } else {
        transition.animateFloat(
            initialValue = 0f,
            targetValue = (2.0 * PI).toFloat(),
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 16000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "aura_phase"
        )
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        val orb1Center = Offset(
            x = w * (0.20f + 0.08f * cos(drift)),
            y = h * (0.14f + 0.04f * sin(drift))
        )
        val orb2Center = Offset(
            x = w * (0.85f + 0.07f * sin(drift)),
            y = h * (0.48f + 0.06f * cos(drift))
        )
        val orb3Center = Offset(
            x = w * (0.35f + 0.06f * cos(drift * 0.7f)),
            y = h * (0.86f + 0.04f * sin(drift * 0.7f))
        )

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    palette.goldAccent.copy(alpha = if (palette.isDark) 0.16f else 0.14f),
                    Color.Transparent
                ),
                center = orb1Center,
                radius = w * 0.62f
            ),
            radius = w * 0.62f,
            center = orb1Center
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    palette.emeraldAccent.copy(alpha = if (palette.isDark) 0.17f else 0.11f),
                    Color.Transparent
                ),
                center = orb2Center,
                radius = w * 0.70f
            ),
            radius = w * 0.70f,
            center = orb2Center
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    palette.goldAccent.copy(alpha = if (palette.isDark) 0.10f else 0.08f),
                    Color.Transparent
                ),
                center = orb3Center,
                radius = w * 0.55f
            ),
            radius = w * 0.55f,
            center = orb3Center
        )
    }
}

/**
 * 3D Specular Islamic Geometric Star (Rub el Hizb) Emblem with animated orbital rings.
 */
@Composable
fun Asaka3DGeometricEmblem(
    modifier: Modifier = Modifier,
    size: Dp = 112.dp,
    isActive: Boolean = true
) {
    val palette = LocalAsakaColors.current
    val reducedMotion = LocalReducedMotion.current
    val density = LocalDensity.current.density
    val transition = rememberInfiniteTransition(label = "3d_emblem")

    val spinDeg by if (isActive && !reducedMotion) {
        transition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 22000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "emblem_spin"
        )
    } else {
        remember { androidx.compose.runtime.mutableFloatStateOf(0f) }
    }

    val breatheY by if (isActive && !reducedMotion) {
        transition.animateFloat(
            initialValue = -9f,
            targetValue = 9f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 3600, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "emblem_3d_tilt"
        )
    } else {
        remember { androidx.compose.runtime.mutableFloatStateOf(0f) }
    }

    Canvas(
        modifier = modifier
            .size(size)
            .graphicsLayer {
                rotationY = breatheY
                rotationX = breatheY * 0.45f
                cameraDistance = 12f * density
            }
    ) {
        val cx = this.size.width / 2f
        val cy = this.size.height / 2f
        val r = this.size.minDimension * 0.44f

        // 3D Specular Sphere Backdrop
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color.White.copy(alpha = 0.28f),
                    palette.goldAccent.copy(alpha = 0.30f),
                    palette.emeraldAccent.copy(alpha = 0.16f),
                    Color.Transparent
                ),
                center = Offset(cx - r * 0.28f, cy - r * 0.28f),
                radius = r * 1.15f
            ),
            radius = r,
            center = Offset(cx, cy)
        )

        // Outer orbital glass ring
        drawCircle(
            brush = Brush.linearGradient(
                listOf(Color.White.copy(alpha = 0.55f), palette.goldAccent, palette.emeraldAccent)
            ),
            radius = r * 0.96f,
            center = Offset(cx, cy),
            style = Stroke(width = 2.5f)
        )

        // Rotating 8-pointed Rub el Hizb Star (2 rotated squares)
        rotate(degrees = spinDeg, pivot = Offset(cx, cy)) {
            val s = r * 0.54f
            for (angle in listOf(0f, 45f)) {
                rotate(degrees = angle, pivot = Offset(cx, cy)) {
                    val path = Path().apply {
                        moveTo(cx - s, cy - s)
                        lineTo(cx + s, cy - s)
                        lineTo(cx + s, cy + s)
                        lineTo(cx - s, cy + s)
                        close()
                    }
                    drawPath(
                        path = path,
                        color = palette.goldAccent.copy(alpha = 0.85f),
                        style = Stroke(width = 2.2f)
                    )
                }
            }
        }

        // Inner specular pearl core
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Color.White.copy(alpha = 0.85f), palette.goldAccent),
                center = Offset(cx - r * 0.08f, cy - r * 0.08f),
                radius = r * 0.22f
            ),
            radius = r * 0.16f,
            center = Offset(cx, cy)
        )
    }
}

/**
 * Animated Progress Ring for Daily Qur'on Goal & Hifz Mastery with luminous glass glow.
 */
@Composable
fun AsakaProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    size: Dp = 64.dp,
    strokeWidth: Dp = 6.dp,
    trackColor: Color = LocalAsakaColors.current.luminousBorder,
    progressColor: Color = LocalAsakaColors.current.goldAccent,
    centerContent: @Composable BoxScope.() -> Unit = {}
) {
    val reducedMotion = LocalReducedMotion.current
    val clamped = progress.coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = clamped,
        animationSpec = if (reducedMotion) tween(0) else tween(750, easing = FastOutSlowInEasing),
        label = "asaka_ring_progress"
    )

    Box(modifier = modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(size)) {
            val strokePx = strokeWidth.toPx()
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )
            drawArc(
                brush = Brush.sweepGradient(
                    listOf(progressColor, Color.White.copy(alpha = 0.9f), progressColor)
                ),
                startAngle = -90f,
                sweepAngle = 360f * animatedProgress,
                useCenter = false,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )
        }
        centerContent()
    }
}

/**
 * Animated Native Audio Waveform respecting Reduced Motion mode.
 */
@Composable
fun AsakaAudioWaveform(
    isPlaying: Boolean,
    modifier: Modifier = Modifier,
    barCount: Int = 7,
    activeColor: Color = LocalAsakaColors.current.goldAccent
) {
    val reducedMotion = LocalReducedMotion.current
    val transition = rememberInfiniteTransition(label = "asaka_wave")

    val phases = List(barCount) { idx ->
        if (isPlaying && !reducedMotion) {
            transition.animateFloat(
                initialValue = 0.25f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(
                        durationMillis = 360 + (idx % 4) * 140,
                        easing = FastOutSlowInEasing
                    ),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "bar_$idx"
            ).value
        } else {
            0.3f + (idx % 3) * 0.16f
        }
    }

    Row(
        modifier = modifier.height(22.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        phases.forEach { ratio ->
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height((6f + 16f * ratio).dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(if (isPlaying) activeColor else activeColor.copy(alpha = 0.45f))
            )
        }
    }
}

/**
 * Subtle Native Loading Shimmer Skeleton (automatically static in Reduced Motion mode).
 */
@Composable
fun AsakaShimmerBox(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 14.dp
) {
    val palette = LocalAsakaColors.current
    val reducedMotion = LocalReducedMotion.current
    val base = if (palette.isDark) Color(0xFF0E2A23) else Color(0xFFE7E0CE)
    val highlight = if (palette.isDark) Color(0xFF173D34) else Color(0xFFF4EFE0)

    val offsetX = if (reducedMotion) {
        0f
    } else {
        val transition = rememberInfiniteTransition(label = "shimmer")
        transition.animateFloat(
            initialValue = -300f,
            targetValue = 900f,
            animationSpec = infiniteRepeatable(
                animation = tween(1200, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "shimmer_x"
        ).value
    }

    val brush = if (reducedMotion) {
        Brush.linearGradient(listOf(base, base))
    } else {
        Brush.linearGradient(
            colors = listOf(base, highlight, base),
            start = Offset(offsetX, 0f),
            end = Offset(offsetX + 260f, 120f)
        )
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(brush)
            .border(0.5.dp, palette.luminousBorder.copy(alpha = 0.4f), RoundedCornerShape(cornerRadius))
    )
}
