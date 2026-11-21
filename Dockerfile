# Build da aplicação
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

COPY . .

WORKDIR /src/CyberCheck/CyberShield.API

RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "CyberShield.API.dll"]
