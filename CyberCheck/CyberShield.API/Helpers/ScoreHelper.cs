namespace CyberShield.API.Helpers;

public sealed record ScoreEvaluation(
    int Score,
    string Risk,
    string Grade,
    int TotalDetections
);

public static class ScoreHelper
{
    public static int CalculateScore(
        int malicious = 0,
        int suspicious = 0,
        bool hasHttps = true,
        bool hasHsts = true,
        bool hasCsp = true,
        bool hasXFrameOptions = true)
    {
        var cleanMalicious = Math.Max(0, malicious);
        var cleanSuspicious = Math.Max(0, suspicious);

        var score = 100;
        score -= cleanMalicious * 25;
        score -= cleanSuspicious * 10;

        if (!hasHttps) score -= 25;
        if (!hasHsts) score -= 10;
        if (!hasCsp) score -= 10;
        if (!hasXFrameOptions) score -= 5;

        return Math.Clamp(score, 0, 100);
    }

    public static string DetermineRisk(int score, int malicious = 0, int suspicious = 0)
    {
        if (malicious > 0 || score < 60)
        {
            return "HIGH";
        }

        if (suspicious > 0 || score < 85)
        {
            return "MEDIUM";
        }

        return "LOW";
    }

    public static string DetermineGrade(int score)
    {
        var clamped = Math.Clamp(score, 0, 100);
        if (clamped >= 90) return "A";
        if (clamped >= 80) return "B";
        if (clamped >= 60) return "C";
        return "D";
    }

    public static ScoreEvaluation Evaluate(
        int malicious = 0,
        int suspicious = 0,
        bool hasHttps = true,
        bool hasHsts = true,
        bool hasCsp = true,
        bool hasXFrameOptions = true)
    {
        var cleanMalicious = Math.Max(0, malicious);
        var cleanSuspicious = Math.Max(0, suspicious);
        var totalDetections = cleanMalicious + cleanSuspicious;

        var score = CalculateScore(
            cleanMalicious,
            cleanSuspicious,
            hasHttps,
            hasHsts,
            hasCsp,
            hasXFrameOptions);

        var risk = DetermineRisk(score, cleanMalicious, cleanSuspicious);
        var grade = DetermineGrade(score);

        return new ScoreEvaluation(score, risk, grade, totalDetections);
    }
}