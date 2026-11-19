using Microsoft.EntityFrameworkCore;
using CyberShield.API.Models;

namespace CyberShield.API.Database;

public class CyberCheckContext : DbContext
{
    public CyberCheckContext(DbContextOptions<CyberCheckContext> options) : base(options)
    {
    }

    public DbSet<ScanHistory> ScanHistories { get; set; }
}