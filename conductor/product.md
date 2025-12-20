# Initial Concept\n\nTennis tournament score tracking web application for the Bracket of Death tournament

# Product Guide - Bracket of Death (BOD)

## Project Vision
A specialized tennis tournament management and score tracking system designed to handle the "Bracket of Death" tournament series. The platform serves as a historical archive and a live management tool for competitive play.

## Target Audience
- **Super Admins:** Platform owners who manage global settings (Mailjet, favicon, system configuration) and manage Admin accounts.
- **Admins:** Tournament organizers who create and manage tournaments, manage player/user accounts, and oversee live tournament execution.
- **Users (Players):** Participants who can view their own statistics, manage their profiles, and receive system notifications/password resets.

## Core Features
- **Role-Based Access Control (RBAC):** Tiered permissions using Keycloak to distinguish between Super Admins, Admins, and Users.
- **Tournament Engine:** Support for creating and running various tournament formats (Single Elimination, Double Elimination, Round Robin).
- **Live Scoring & Management:** Courtside management of match results with a focus on data integrity and mobile usability.
- **Historical Archive:** Visualization of tournament data dating back to 2009, including player championships and win/loss records.
- **Self-Service Portal:** User ability to update profile information and perform secure password resets via email.

## User Experience Goals
- **Mobile-First Execution:** Optimized for use on mobile devices at the tennis courts.
- **Robust Data Integrity:** Strict validation logic to ensure tournament brackets and scores remain consistent throughout the lifecycle.
- **Seamless Authentication:** A secure and user-friendly login experience powered by Keycloak.

## Success Metrics
- Successful execution of live tournaments without data corruption.
- Accuracy of historical data imports and statistics.
- Ease of use for players checking their brackets and schedules on mobile.
