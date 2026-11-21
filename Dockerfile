# BLOCO 01: Build da aplicação .NET
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
WORKDIR /src/CyberCheck.API
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# BLOCO 02: Imagem de execução (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "CyberCheck.API.dll"]