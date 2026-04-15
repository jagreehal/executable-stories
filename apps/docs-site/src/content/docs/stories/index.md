---
title: User Stories
description: 3 scenarios — passed
sidebar:
  badge:
    text: Passed
    variant: success
---
## src/auth/login.test.ts

### Authentication

### ✅ User logs in successfully
Tags: `auth`, `login`

**Given** user is on login page
**When** user enters valid credentials
**Then** user sees dashboard

## src/auth/logout.test.ts

### Authentication

### ✅ User can logout
Tags: `auth`

**Given** user is logged in
**When** user clicks logout
**Then** user sees login page

## src/dashboard/stats.test.ts

### Dashboard

### ✅ Dashboard shows user stats
Tags: `dashboard`

**Given** user is logged in
**When** user views dashboard
**Then** user sees their stats