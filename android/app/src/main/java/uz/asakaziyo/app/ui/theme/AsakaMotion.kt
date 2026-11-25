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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

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
}

/**
 * Spatial Liquid Glass Card with Luminous Champagne Gold / Emerald border.
 */
@Composable
fun AsakaGlassCard(
    modifier: Modifier = Modifier,
    elevated: Boolean = false,
    cornerRadius: Dp = 22.dp,
    borderColor: Color? = null,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val palette = LocalAsakaColors.current
    val haptics = LocalHapticFeedback.current
    val shape = RoundedCornerShape(cornerRadius)
    val bg = if (elevated) palette.glassSurfaceElevated else palette.glassSurface
    val resolvedBorder = borderColor ?: palette.luminousBorder

    Surface(
        modifier = modifier
            .clip(shape)
            .then(
                if (onClick != null) {
                    Modifier.clickable {
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onClick()
                    }
                } else Modifier
            ),
        shape = shape,
        color = bg,
        border = BorderStroke(1.dp, resolvedBorder),
        shadowElevation = if (elevated) 6.dp else 1.dp
    ) {
        Box(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color.White.copy(alpha = if (palette.isDark) 0.045f else 0.35f),
                            Color.Transparent
                        )
                    )
                )
                .padding(16.dp),
            content = content
        )
    }
}

/**
 * Animated Progress Ring for Daily Qur'on Goal & Hifz Mastery.
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
                color = progressColor,
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
