# BLOCO 01: Build da aplicação .NET 9
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY . .
WORKDIR /src/CyberCheck/CyberShield.API
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# BLOCO 02: Imagem de execução (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "CyberShield.API.dll"]