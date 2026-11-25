package uz.asakaziyo.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * ASAKA ZIYO 2026 — Premium Islamic Minimalism Design System
 *
 * Palette:
 * - Deep Emerald (#031814), Midnight Green (#071E19), OLED Black (#000000)
 * - Champagne Gold (#C6A45C), Soft Gold Glow (#E2C98A)
 * - Warm Ivory (#F8F5EC), Porcelain Surface (#FFFFFF), Graphite (#1C2522)
 * - Spatial Depth Layering, Luminous Borders & Liquid Glass surfaces
 */
object AsakaColors {
    val DeepEmerald = Color(0xFF031814)
    val OledBlack = Color(0xFF000000)
    val MidnightGreen = Color(0xFF071E19)
    val EmeraldSurface = Color(0xFF0B2922)
    val EmeraldPrimary = Color(0xFF0A5C43)
    val EmeraldBright = Color(0xFF10B981)
    val ChampagneGold = Color(0xFFC6A45C)
    val GoldLuminous = Color(0xFFE5CA8C)
    val GoldDeep = Color(0xFF8F7232)
    val WarmIvory = Color(0xFFF8F5EC)
    val IvorySurface = Color(0xFFFFFFFF)
    val IvoryMuted = Color(0xFFEDE7D8)
    val Graphite = Color(0xFF1C2522)
    val GraphiteMuted = Color(0xFF52615B)
    val DarkTextPrimary = Color(0xFFF6F3EB)
    val DarkTextSecondary = Color(0xFFA7B8B1)
    val DangerRose = Color(0xFFE15B64)
    val InfoSky = Color(0xFF38BDF8)
}

@Immutable
data class AsakaExtendedColors(
    val isDark: Boolean,
    val backgroundGradient: Brush,
    val glassSurface: Color,
    val glassSurfaceElevated: Color,
    val luminousBorder: Color,
    val goldAccent: Color,
    val goldSoftBg: Color,
    val emeraldAccent: Color,
    val emeraldSoftBg: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val navBarSurface: Color,
    val danger: Color
)

private val DarkExtendedColors = AsakaExtendedColors(
    isDark = true,
    backgroundGradient = Brush.verticalGradient(
        colors = listOf(AsakaColors.DeepEmerald, AsakaColors.MidnightGreen, AsakaColors.OledBlack)
    ),
    glassSurface = Color(0xCC09201B),
    glassSurfaceElevated = Color(0xE60F2D26),
    luminousBorder = Color(0x38C6A45C),
    goldAccent = AsakaColors.ChampagneGold,
    goldSoftBg = Color(0x22C6A45C),
    emeraldAccent = AsakaColors.EmeraldBright,
    emeraldSoftBg = Color(0x2410B981),
    textPrimary = AsakaColors.DarkTextPrimary,
    textSecondary = AsakaColors.DarkTextSecondary,
    textMuted = Color(0xFF70857D),
    navBarSurface = Color(0xF0051612),
    danger = AsakaColors.DangerRose
)

private val LightExtendedColors = AsakaExtendedColors(
    isDark = false,
    backgroundGradient = Brush.verticalGradient(
        colors = listOf(AsakaColors.WarmIvory, Color(0xFFF3EFE3), AsakaColors.WarmIvory)
    ),
    glassSurface = Color(0xEBFFFFFF),
    glassSurfaceElevated = Color(0xFFFFFFFF),
    luminousBorder = Color(0x380A5C43),
    goldAccent = AsakaColors.GoldDeep,
    goldSoftBg = Color(0x1EC6A45C),
    emeraldAccent = AsakaColors.EmeraldPrimary,
    emeraldSoftBg = Color(0x170A5C43),
    textPrimary = AsakaColors.Graphite,
    textSecondary = AsakaColors.GraphiteMuted,
    textMuted = Color(0xFF7B8A84),
    navBarSurface = Color(0xF5FFFFFF),
    danger = AsakaColors.DangerRose
)

val LocalAsakaColors = staticCompositionLocalOf { DarkExtendedColors }

private val AsakaDarkColorScheme = darkColorScheme(
    primary = AsakaColors.ChampagneGold,
    onPrimary = AsakaColors.DeepEmerald,
    primaryContainer = AsakaColors.EmeraldPrimary,
    onPrimaryContainer = AsakaColors.DarkTextPrimary,
    secondary = AsakaColors.EmeraldBright,
    onSecondary = AsakaColors.DeepEmerald,
    background = AsakaColors.DeepEmerald,
    onBackground = AsakaColors.DarkTextPrimary,
    surface = AsakaColors.MidnightGreen,
    onSurface = AsakaColors.DarkTextPrimary,
    surfaceVariant = AsakaColors.EmeraldSurface,
    onSurfaceVariant = AsakaColors.DarkTextSecondary,
    outline = Color(0x40C6A45C),
    error = AsakaColors.DangerRose
)

private val AsakaLightColorScheme = lightColorScheme(
    primary = AsakaColors.EmeraldPrimary,
    onPrimary = Color.White,
    primaryContainer = AsakaColors.IvoryMuted,
    onPrimaryContainer = AsakaColors.Graphite,
    secondary = AsakaColors.GoldDeep,
    onSecondary = Color.White,
    background = AsakaColors.WarmIvory,
    onBackground = AsakaColors.Graphite,
    surface = AsakaColors.IvorySurface,
    onSurface = AsakaColors.Graphite,
    surfaceVariant = AsakaColors.IvoryMuted,
    onSurfaceVariant = AsakaColors.GraphiteMuted,
    outline = Color(0x330A5C43),
    error = AsakaColors.DangerRose
)

val AsakaTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.4).sp
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 21.sp,
        lineHeight = 27.sp,
        letterSpacing = (-0.2).sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 19.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 17.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 15.sp,
        letterSpacing = 0.4.sp
    )
)

val AsakaShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(30.dp)
)

@Composable
fun AsakaZiyoTheme(
    themeMode: String = "dark",
    reducedMotion: Boolean = false,
    content: @Composable () -> Unit
) {
    val isDark = when (themeMode) {
        "light" -> false
        "system" -> isSystemInDarkTheme()
        else -> true
    }
    val extended = if (isDark) DarkExtendedColors else LightExtendedColors
    val colorScheme = if (isDark) AsakaDarkColorScheme else AsakaLightColorScheme

    CompositionLocalProvider(
        LocalAsakaColors provides extended,
        LocalReducedMotion provides reducedMotion
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AsakaTypography,
            shapes = AsakaShapes,
            content = content
        )
    }
}
