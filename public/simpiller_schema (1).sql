-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: localhost    Database: simpiller
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ADD_SED_LIST`
--

DROP TABLE IF EXISTS `ADD_SED_LIST`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ADD_SED_LIST` (
  `TARGET_NAME` varchar(50) DEFAULT NULL,
  `ALT_NAME` varchar(50) DEFAULT NULL,
  `DRUG_CLASS` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES`
--

DROP TABLE IF EXISTS `AGENCIES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `AGENCY_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `AGENCY_CREATED` datetime DEFAULT NULL,
  `AGENCY_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `AGENCY_UPDATED` datetime DEFAULT NULL,
  `AGENCY_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `AGENCY_SUBDOMAIN` varchar(50) DEFAULT NULL,
  `AGENCY_ACRONYM` varchar(20) DEFAULT NULL,
  `AGENCY_NAME` varchar(50) DEFAULT NULL,
  `AGENCY_BRANDNAME` varchar(50) DEFAULT NULL,
  `AGENCY_TAGLINE` varchar(255) DEFAULT NULL,
  `AGENCY_COLORS` varchar(255) DEFAULT 'ff6600,0da2b0,0066ff',
  `AGENCY_STREET1` varchar(50) DEFAULT NULL,
  `AGENCY_STREET2` varchar(50) DEFAULT NULL,
  `AGENCY_CITY` varchar(50) DEFAULT NULL,
  `AGENCY_STATE` char(2) DEFAULT NULL,
  `AGENCY_COUNTY` varchar(50) DEFAULT NULL,
  `AGENCY_TAX_RATE` decimal(10,4) unsigned DEFAULT '8.0000',
  `AGENCY_PROVINCE` varchar(50) DEFAULT NULL,
  `AGENCY_POSTAL_CODE` varchar(10) DEFAULT NULL,
  `AGENCY_COUNTRY` varchar(10) DEFAULT NULL,
  `AGENCY_TIMEZONE` varchar(50) DEFAULT NULL,
  `AGENCY_GEO_LAT` varchar(50) DEFAULT '0.00000000',
  `AGENCY_GEO_LNG` varchar(50) DEFAULT '0.00000000',
  `AGENCY_PHONE` varchar(20) DEFAULT NULL,
  `AGENCY_FAX` varchar(20) DEFAULT NULL,
  `AGENCY_EMAIL` varchar(100) DEFAULT NULL,
  `AGENCY_WEBSITE` varchar(255) DEFAULT NULL,
  `AGENCY_GENDER_TYPE` char(1) DEFAULT NULL COMMENT 'Blank or Null, F or M',
  `AGENCY_GENDER_WOKE` tinyint unsigned NOT NULL DEFAULT '0',
  `AGENCY_DOH_FAX` varchar(20) DEFAULT NULL,
  `AGENCY_SMS_NUMBER` varchar(20) DEFAULT NULL,
  `AGENCY_CONTACT_NAME` varchar(50) DEFAULT NULL,
  `AGENCY_TAXONOMY` varchar(100) DEFAULT NULL,
  `AGENCY_CLIA_ID` varchar(10) DEFAULT NULL,
  `AGENCY_CLIENT_NAME` varchar(50) DEFAULT 'Client',
  `AGENCY_PID_TITLE` varchar(50) DEFAULT 'Client ID',
  `AGENCY_AGENT_TITLE` varchar(50) DEFAULT 'Clinician',
  `AGENCY_MSH4` varchar(50) DEFAULT NULL,
  `AGENCY_EVENT_KEY` varchar(50) DEFAULT NULL,
  `AGENCY_PRINTER_CHANNEL` int unsigned NOT NULL DEFAULT '1',
  `AGENCY_PRINT_COUNT` tinyint unsigned NOT NULL DEFAULT '1',
  `AGENCY_DISCLAIMER` mediumtext,
  PRIMARY KEY (`AGENCY_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_DX`
--

DROP TABLE IF EXISTS `AGENCIES_DX`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_DX` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `ICD_CODE` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`AGENCY_CODE`,`ICD_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_GROUPS`
--

DROP TABLE IF EXISTS `AGENCIES_GROUPS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_GROUPS` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `GROUP_CODE` varchar(20) NOT NULL DEFAULT '',
  `GROUP_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `GROUP_DETAIL` mediumtext,
  PRIMARY KEY (`AGENCY_CODE`,`GROUP_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_LABS`
--

DROP TABLE IF EXISTS `AGENCIES_LABS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_LABS` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `AL_UPDATED` datetime DEFAULT NULL,
  `AL_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `AL_BAA_FILENAME` varchar(255) DEFAULT NULL,
  `AL_RESTRICTED_IPS` varchar(255) DEFAULT NULL,
  `AL_DIRECT_BILL` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_DISALLOW_MCD` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_AUTO_ACTIVATE` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_RVX` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_USE_RX` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Require Prescription Revew',
  `AL_USE_DX` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Require Diagnosis Review',
  `AL_USE_DA` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Require Designation of Authority',
  `AL_USE_RS` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Require Routine Signature',
  `AL_VEHICLE` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Allow Vehicle Drive Up Service',
  `AL_RPH` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Require Phone Number',
  `AL_REM` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Require Email',
  `AL_NG` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_ADDR` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Override Patient Address with Agency Address',
  `AL_USE_AL` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Enable A La Carte Ordering',
  `AL_USE_XL` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Allow External Specimen Labels',
  `AL_STR_CONF` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_RTG` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_USA` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_NOCALC` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_DOH` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_POS_ONLY` tinyint unsigned NOT NULL DEFAULT '1',
  `AL_AGPOS_SMS` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_AGPOS_EMAIL` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_SMS_PATIENTS` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_BLANK_SPECIMEN` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_CHART_SYSTEM` varchar(50) DEFAULT NULL,
  `AL_CHART_SFTP_ADDRESS` varchar(100) DEFAULT '0.0.0.0',
  `AL_CHART_SFTP_PORT` int unsigned NOT NULL DEFAULT '22',
  `AL_CHART_SFTP_USER` varchar(50) DEFAULT NULL,
  `_AL_CHART_SFTP_PASSWORD` varbinary(100) DEFAULT NULL,
  `AL_CHART_SFTP_RESULTS` varchar(255) DEFAULT NULL,
  `AL_CHART_SFTP_RESULTS_FORMAT` varchar(20) DEFAULT 'hl7',
  `AL_CHART_SFTP_ORDERS` varchar(255) DEFAULT NULL,
  `AL_CHART_HL7_PDF` tinyint unsigned NOT NULL DEFAULT '0',
  `_AL_ZIP_PASSWORD` varbinary(100) DEFAULT NULL,
  `AL_CHART_ADT_API` varchar(255) DEFAULT NULL,
  `AL_CHART_ADT_FIELDNAME` varchar(50) DEFAULT NULL,
  `AL_HOLD_PENDING` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '0 = Immediate Conversion to Order, 1 = Hold until Midnight of Collection Date',
  `AL_HOLD_LABEL` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_HOLD_SHIPPED` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_HOLD_REVIEWED` tinyint unsigned NOT NULL DEFAULT '0',
  `AL_API_SYSTEM` varchar(50) DEFAULT NULL,
  `AL_API_URL` varchar(255) DEFAULT NULL,
  `AL_API_KEY` varchar(255) DEFAULT NULL,
  `AL_API_GET_URI` varchar(255) DEFAULT NULL,
  `AL_API_POST_URI` varchar(255) DEFAULT NULL,
  `AL_API_UPDATE_URI` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`AGENCY_CODE`,`LAB_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_LABS_PACKAGES`
--

DROP TABLE IF EXISTS `AGENCIES_LABS_PACKAGES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_LABS_PACKAGES` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `PACKAGE_NAME` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`AGENCY_CODE`,`LAB_NPI`,`PACKAGE_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_MEDNEC`
--

DROP TABLE IF EXISTS `AGENCIES_MEDNEC`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_MEDNEC` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `MEDNEC_CODE` varchar(20) NOT NULL DEFAULT '',
  `MEDNEC_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `MEDNEC_DETAIL` mediumtext,
  PRIMARY KEY (`AGENCY_CODE`,`MEDNEC_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_PATIENTS`
--

DROP TABLE IF EXISTS `AGENCIES_PATIENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_PATIENTS` (
  `AGENCY_CODE` varchar(50) NOT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `AP_MRN` varchar(50) DEFAULT NULL,
  `AP_ACTIVE` tinyint unsigned NOT NULL DEFAULT '2',
  `AP_INTAKE_FILENAME` varchar(255) DEFAULT NULL,
  `AP_LAST_FILENAME` varchar(255) DEFAULT NULL,
  `GROUP_CODE` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`AGENCY_CODE`,`PATIENT_ID`),
  KEY `LK_MRN` (`AP_MRN`),
  KEY `FK_GROUP` (`GROUP_CODE`),
  KEY `LK_ACTIVE` (`AP_ACTIVE`),
  KEY `FK_PATIENT` (`PATIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_PATIENTS_LABS_PACKAGES`
--

DROP TABLE IF EXISTS `AGENCIES_PATIENTS_LABS_PACKAGES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_PATIENTS_LABS_PACKAGES` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `AGENCY_NPI` varchar(10) NOT NULL DEFAULT '',
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `PACKAGE_NAME` varchar(50) NOT NULL DEFAULT '',
  `APLP_CREATED` datetime DEFAULT NULL,
  `APLP_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `APLP_FREQUENCY` int unsigned DEFAULT '1' COMMENT '1 = once, 52 = weekly etc, 365 = as needed',
  `APLP_DURATION` date DEFAULT NULL COMMENT 'if Null = until discharge',
  PRIMARY KEY (`AGENCY_CODE`,`PATIENT_ID`,`LAB_NPI`,`PACKAGE_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_PRACTITIONERS`
--

DROP TABLE IF EXISTS `AGENCIES_PRACTITIONERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_PRACTITIONERS` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `PRACTITIONER_NPI` varchar(10) NOT NULL DEFAULT '',
  `AP_ALT_ID` varchar(50) DEFAULT NULL,
  `AP_CREATED` datetime DEFAULT NULL,
  `AP_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `AP_DA_FILENAME` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`AGENCY_CODE`,`PRACTITIONER_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_PRACTITIONERS_APPOINTMENTS`
--

DROP TABLE IF EXISTS `AGENCIES_PRACTITIONERS_APPOINTMENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_PRACTITIONERS_APPOINTMENTS` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `PRACTITIONER_NPI` varchar(10) NOT NULL DEFAULT '',
  `AUA_START` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `AUA_MINUTES` int unsigned NOT NULL DEFAULT '0' COMMENT 'minutes',
  `AUA_END` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `ROOM_CODE` varchar(50) DEFAULT NULL,
  `AUA_NOTE` mediumtext,
  `AUA_CREATED` datetime DEFAULT NULL,
  `AUA_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `AUA_ARRIVAL` datetime DEFAULT NULL,
  `AUA_STATUS` varchar(50) DEFAULT NULL,
  `AUA_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`AGENCY_CODE`,`PRACTITIONER_NPI`,`AUA_START`),
  KEY `LK_ARRIVAL` (`AUA_ARRIVAL`),
  KEY `LK_STATUS` (`AUA_STATUS`),
  KEY `LK_ACTIVE` (`AUA_ACTIVE`),
  KEY `LK_AGENCY_ROOM` (`AGENCY_CODE`,`ROOM_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_ROOMS`
--

DROP TABLE IF EXISTS `AGENCIES_ROOMS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_ROOMS` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `ROOM_NAME` varchar(50) NOT NULL,
  `AR_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`AGENCY_CODE`,`ROOM_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AGENCIES_USERS`
--

DROP TABLE IF EXISTS `AGENCIES_USERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AGENCIES_USERS` (
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `AGENCY_NPI` varchar(10) NOT NULL DEFAULT '',
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`AGENCY_CODE`,`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `APPOINTMENTS`
--

DROP TABLE IF EXISTS `APPOINTMENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `APPOINTMENTS` (
  `APPT_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `APPT_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `APPT_CREATED` datetime DEFAULT NULL,
  `APPT_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `APPT_UPDATED` datetime DEFAULT NULL,
  `APPT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `APPT_START` datetime DEFAULT NULL,
  `APPT_END` datetime DEFAULT NULL,
  `APPT_MINUTES` smallint unsigned NOT NULL DEFAULT '0',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `ROOM_NAME` varchar(50) DEFAULT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `APPT_REASON` mediumtext,
  `APPT_NOTES` mediumtext,
  `APPT_COLOR` varchar(255) DEFAULT NULL,
  `APPT_STATUS` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`APPT_ID`),
  UNIQUE KEY `APPT_UNIQUE` (`PRACTITIONER_NPI`,`APPT_START`),
  KEY `FK_PATIENT` (`PATIENT_ID`),
  KEY `LK_STATUS` (`APPT_STATUS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `APPOINTMENTS_CANCELED`
--

DROP TABLE IF EXISTS `APPOINTMENTS_CANCELED`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `APPOINTMENTS_CANCELED` (
  `APPT_ID` int unsigned NOT NULL,
  `APPT_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `APPT_CREATED` datetime DEFAULT NULL,
  `APPT_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `APPT_UPDATED` datetime DEFAULT NULL,
  `APPT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `APPT_START` datetime DEFAULT NULL,
  `APPT_END` datetime DEFAULT NULL,
  `APPT_MINUTES` smallint unsigned NOT NULL DEFAULT '0',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `ROOM_NAME` varchar(50) DEFAULT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `APPT_REASON` mediumtext,
  `APPT_NOTES` mediumtext,
  `APPT_COLOR` varchar(255) DEFAULT NULL,
  `APPT_STATUS` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `BLACKLIST`
--

DROP TABLE IF EXISTS `BLACKLIST`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `BLACKLIST` (
  `IPV4` varchar(15) NOT NULL DEFAULT '0.0.0.0',
  `PREFIX` varchar(15) NOT NULL,
  `BLACKLIST_CREATED` datetime DEFAULT NULL,
  `BLACKLIST_DETAIL` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IPV4`,`PREFIX`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CALS_QC`
--

DROP TABLE IF EXISTS `CALS_QC`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CALS_QC` (
  `ID` double DEFAULT NULL,
  `TARGET_NAME` varchar(50) DEFAULT NULL,
  `ANALYTE` varchar(50) DEFAULT NULL,
  `L1_40` double DEFAULT NULL,
  `L2_75` double DEFAULT NULL,
  `L3_100` double DEFAULT NULL,
  `L4_3X` double DEFAULT NULL,
  `L5_6X` double DEFAULT NULL,
  `L6_10X` double DEFAULT NULL,
  `L7_25X` double DEFAULT NULL,
  `QC2` double DEFAULT NULL,
  `QC3` double DEFAULT NULL,
  `QC5` double DEFAULT NULL,
  `QC6` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CENSUS`
--

DROP TABLE IF EXISTS `CENSUS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CENSUS` (
  `IP_PREFIX` varchar(11) NOT NULL DEFAULT '',
  `IP_CREATED` datetime DEFAULT NULL,
  `IP_UPDATED` datetime DEFAULT NULL,
  `geobytesforwarderfor` varchar(255) DEFAULT NULL COMMENT 'e.g. https://www.google.com',
  `geobytesremoteip` varchar(20) DEFAULT NULL COMMENT 'e.g. 10.10.10.10',
  `geobytesipaddress` varchar(20) DEFAULT NULL COMMENT 'e.g. 69.25.58.61',
  `geobytescertainty` int DEFAULT NULL COMMENT 'e.g. 63',
  `geobytesinternet` varchar(10) DEFAULT NULL COMMENT 'e.g. US',
  `geobytescountry` varchar(20) DEFAULT NULL COMMENT 'e.g. United States',
  `geobytesregionlocationcode` varchar(10) DEFAULT NULL COMMENT 'e.g. USNY',
  `geobytesregion` varchar(20) DEFAULT NULL COMMENT 'e.g. New York',
  `geobytescode` varchar(10) DEFAULT NULL COMMENT 'e.g. NY',
  `geobyteslocationcode` varchar(10) DEFAULT NULL COMMENT 'e.g. USNYSISL',
  `geobytesdma` varchar(10) DEFAULT NULL COMMENT 'e.g. 501',
  `geobytescity` varchar(20) DEFAULT NULL COMMENT 'e.g. Staten Island',
  `geobytescityid` varchar(10) DEFAULT NULL COMMENT 'e.g. 10223',
  `geobytesfqcn` varchar(255) DEFAULT NULL COMMENT 'e.g. Staten Island, NY, United States',
  `geobyteslatitude` varchar(20) DEFAULT NULL COMMENT 'e.g. 40.590199',
  `geobyteslongitude` varchar(20) DEFAULT NULL COMMENT 'e.g. -74.147102',
  `geobytescapital` varchar(20) DEFAULT NULL COMMENT 'e.g. Washington',
  `geobytestimezone` varchar(10) DEFAULT NULL COMMENT 'e.g. -05:00',
  `geobytesnationalitysingular` varchar(20) DEFAULT NULL COMMENT 'e.g. American',
  `geobytespopulation` varchar(20) DEFAULT NULL COMMENT 'e.g. 278058881',
  `geobytesnationalityplural` varchar(20) DEFAULT NULL COMMENT 'e.g. Americans',
  `geobytesmapreference` varchar(20) DEFAULT NULL COMMENT 'e.g. North America',
  `geobytescurrency` varchar(255) DEFAULT NULL COMMENT 'e.g. US Dollar',
  `geobytescurrencycode` varchar(255) DEFAULT NULL COMMENT 'e.g. USD',
  `geobytestitle` varchar(255) DEFAULT NULL COMMENT 'e.g. The United States',
  PRIMARY KEY (`IP_PREFIX`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `COUNTRIES`
--

DROP TABLE IF EXISTS `COUNTRIES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `COUNTRIES` (
  `COUNTRY_CODE` char(2) NOT NULL DEFAULT '',
  `COUNTRY_NAME` varchar(50) DEFAULT NULL,
  `ISD_CODE` int unsigned DEFAULT NULL,
  `ISD_ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `COUNTRY_FLAG` mediumtext,
  PRIMARY KEY (`COUNTRY_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `COUNTRIES_TIMEZONES`
--

DROP TABLE IF EXISTS `COUNTRIES_TIMEZONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `COUNTRIES_TIMEZONES` (
  `COUNTRY_CODE` char(2) NOT NULL DEFAULT '',
  `ZONE_ID` int unsigned NOT NULL DEFAULT '0',
  `ZONE_NAME` varchar(35) NOT NULL DEFAULT '',
  `TIMEZONE_CODE` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`COUNTRY_CODE`,`ZONE_ID`),
  UNIQUE KEY `LK_ZONE_UNIQUE` (`ZONE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DEPARTMENTS`
--

DROP TABLE IF EXISTS `DEPARTMENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DEPARTMENTS` (
  `DEPT_CODE` char(3) NOT NULL DEFAULT '',
  `DEPT_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `DEPT_CREATED` datetime DEFAULT NULL,
  `DEPT_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `DEPT_UPDATED` datetime DEFAULT NULL,
  `DEPT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `DEPT_NAME` varchar(255) DEFAULT NULL,
  `DEPT_DETAIL` mediumtext,
  PRIMARY KEY (`DEPT_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DEPARTMENTS_PRACTITIONERS`
--

DROP TABLE IF EXISTS `DEPARTMENTS_PRACTITIONERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DEPARTMENTS_PRACTITIONERS` (
  `DEPT_CODE` char(3) NOT NULL DEFAULT '',
  `PRACTITIONER_NPI` varchar(10) NOT NULL,
  PRIMARY KEY (`DEPT_CODE`,`PRACTITIONER_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DRUGS_UNKNOWN`
--

DROP TABLE IF EXISTS `DRUGS_UNKNOWN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DRUGS_UNKNOWN` (
  `DRUG_NAME` varchar(50) NOT NULL DEFAULT '',
  `DRUG_ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`DRUG_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DRUG_CLASSES`
--

DROP TABLE IF EXISTS `DRUG_CLASSES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DRUG_CLASSES` (
  `DRUG_CLASS` varchar(50) NOT NULL DEFAULT '',
  `DC_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `DC_NAME` varchar(50) DEFAULT NULL,
  `DC_DESCRIPTION` mediumtext,
  `HCPC_CODE_MCD` varchar(10) DEFAULT NULL,
  `HCPC_CODE_CMS` varchar(10) DEFAULT NULL,
  `DC_LOINC` varchar(10) DEFAULT NULL,
  `DC_DEA_ID` varchar(10) DEFAULT NULL,
  `DC_SCHEDULE` char(4) DEFAULT NULL,
  `DC_NARCOTIC` tinyint unsigned NOT NULL DEFAULT '0',
  `DC_DET_DAYS` smallint unsigned DEFAULT '0',
  PRIMARY KEY (`DRUG_CLASS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DRUG_LOGIC_TARGETS`
--

DROP TABLE IF EXISTS `DRUG_LOGIC_TARGETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DRUG_LOGIC_TARGETS` (
  `DRUG_BRANDNAME` varchar(50) NOT NULL DEFAULT '',
  `TARGET_NAME` varchar(50) NOT NULL DEFAULT '',
  `TARGET_KEY` char(1) DEFAULT NULL,
  `DRUG_CLASS` varchar(50) DEFAULT NULL,
  `DETECTION_DAYS` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`DRUG_BRANDNAME`,`TARGET_NAME`),
  KEY `LK_KEY` (`TARGET_KEY`),
  KEY `FK_CLASS` (`DRUG_CLASS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ETHNICITY`
--

DROP TABLE IF EXISTS `ETHNICITY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ETHNICITY` (
  `ETHNICITY_CODE` varchar(20) NOT NULL,
  `HIERARCHICAL_CODE` varchar(20) DEFAULT NULL,
  `CONCEPT` varchar(50) DEFAULT NULL,
  `SYNONYM` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ETHNICITY_CODE`),
  KEY `LK_CONCEPT` (`CONCEPT`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `GROUPS`
--

DROP TABLE IF EXISTS `GROUPS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GROUPS` (
  `GROUP_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `GROUP_ACTIVE` tinyint unsigned DEFAULT '1',
  `GROUP_NAME` varchar(50) NOT NULL DEFAULT '',
  `GROUP_DESCRIPTION` varchar(250) DEFAULT NULL,
  `GROUP_LIS_ONLY` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`GROUP_ID`),
  UNIQUE KEY `GROUP_ID` (`GROUP_ID`),
  KEY `GROUP_ID_2` (`GROUP_ID`,`GROUP_NAME`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HCPC_CODES`
--

DROP TABLE IF EXISTS `HCPC_CODES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HCPC_CODES` (
  `HCPC_CODE` varchar(50) NOT NULL DEFAULT '',
  `SPECIMEN_TYPE` varchar(50) NOT NULL DEFAULT 'URINE',
  `HCPC_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `HCPC_GROUP` varchar(50) DEFAULT 'TOXICOLOGY',
  `HCPC_DESC_SHORT` varchar(50) DEFAULT NULL,
  `HCPC_DESC_LONG` longtext,
  `HCPC_LCD_ID` int DEFAULT NULL,
  PRIMARY KEY (`HCPC_CODE`,`SPECIMEN_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ICD_10`
--

DROP TABLE IF EXISTS `ICD_10`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ICD_10` (
  `ICD_CODE` varchar(50) NOT NULL DEFAULT '',
  `ICD_ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `ICD_KEYWORD` varchar(20) DEFAULT NULL,
  `ICD_CMS_PAYABLE` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '0=Not Often Paid, 1=Frequently Paid',
  `ICD_DESC_SHORT` varchar(255) DEFAULT NULL,
  `ICD_DESC_LONG` mediumtext,
  `ICD_DSM` varchar(100) DEFAULT NULL,
  `ICD_ORDER` varchar(6) DEFAULT NULL,
  PRIMARY KEY (`ICD_CODE`),
  KEY `LK_DESC` (`ICD_DESC_SHORT`),
  KEY `LK_PAYABLE` (`ICD_CMS_PAYABLE`),
  KEY `LK_ACTIVE` (`ICD_ACTIVE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `INSTRUMENTS`
--

DROP TABLE IF EXISTS `INSTRUMENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `INSTRUMENTS` (
  `INSTRUMENT_CODE` varchar(20) NOT NULL DEFAULT '',
  `INSTRUMENT_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `INSTRUMENT_NAME` varchar(50) DEFAULT NULL,
  `INSTRUMENT_CLASS` varchar(50) DEFAULT NULL COMMENT 'IMMUNOASSAY,GC/MS,LC/MS/MS,LC/MS/QQQ,LC/TOF,CE/TOF',
  `INSTRUMENT_IMAGE` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`INSTRUMENT_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `INVOICES`
--

DROP TABLE IF EXISTS `INVOICES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `INVOICES` (
  `INVOICE_NUMBER` int unsigned NOT NULL AUTO_INCREMENT,
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `INVOICE_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `INVOICE_CREATED` datetime DEFAULT NULL,
  `INVOICE_MONTH` int unsigned NOT NULL DEFAULT '0',
  `INVOICE_YEAR` int unsigned NOT NULL DEFAULT '0',
  `INVOICE_SDATE` date DEFAULT NULL,
  `INVOICE_EDATE` date DEFAULT NULL,
  `INVOICE_QUAN` int unsigned NOT NULL DEFAULT '0',
  `INVOICE_RATE` decimal(10,2) unsigned DEFAULT '0.95',
  `INVOICE_EXT` decimal(10,2) unsigned DEFAULT '0.00',
  `INVOICE_SALES_TAX_RATE` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `INVOICE_SALES_TAX` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `INVOICE_SENT` datetime DEFAULT NULL,
  `INVOICE_SENT_EMAIL` varchar(100) DEFAULT NULL,
  `INVOICE_MESSAGE` varchar(255) DEFAULT 'Thank You for Your Business!',
  `INVOICE_PAID` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `INVOICE_PAID_DATE` date DEFAULT NULL,
  `INVOICE_WRITEOFF` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `INVOICE_WRITEOFF_DATE` date DEFAULT NULL,
  `INVOICE_BALANCE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `INVOICE_ORDERS` longtext,
  PRIMARY KEY (`INVOICE_NUMBER`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS`
--

DROP TABLE IF EXISTS `LABS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `LAB_CLIA_ID` varchar(10) DEFAULT NULL,
  `LAB_COLA_ID` varchar(10) DEFAULT NULL,
  `LAB_PFI` varchar(20) DEFAULT NULL,
  `LAB_TAX_ID` varchar(50) DEFAULT NULL,
  `LAB_FLEET_ID` char(3) NOT NULL DEFAULT '000',
  `LAB_ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `LAB_CREATED` datetime DEFAULT NULL,
  `LAB_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `LAB_UPDATED` datetime DEFAULT NULL,
  `LAB_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `LAB_SUBDOMAIN` varchar(50) DEFAULT NULL,
  `LAB_TYPE` char(4) DEFAULT 'POL' COMMENT 'POL, REF',
  `LAB_NAME` varchar(50) DEFAULT NULL,
  `LAB_BRANDNAME` varchar(50) DEFAULT NULL,
  `LAB_TAGLINE` varchar(255) DEFAULT NULL,
  `LAB_COLORS` varchar(255) DEFAULT '633dae,007fe2,00aa00',
  `LAB_STREET1` varchar(50) DEFAULT NULL,
  `LAB_STREET2` varchar(50) DEFAULT NULL,
  `LAB_CITY` varchar(50) DEFAULT NULL,
  `LAB_STATE` char(2) DEFAULT NULL,
  `LAB_COUNTY` varchar(50) DEFAULT NULL,
  `LAB_TAX_RATE` decimal(10,4) unsigned DEFAULT NULL,
  `LAB_PROVINCE` varchar(50) DEFAULT NULL,
  `LAB_POSTAL` varchar(10) DEFAULT NULL,
  `LAB_COUNTRY` varchar(20) DEFAULT NULL,
  `LAB_TIMEZONE` varchar(20) DEFAULT NULL,
  `LAB_GEO_LAT` varchar(50) DEFAULT '0.00000000',
  `LAB_GEO_LNG` varchar(50) DEFAULT '0.00000000',
  `LAB_PHONE` varchar(20) DEFAULT NULL,
  `LAB_FAX` varchar(20) DEFAULT NULL,
  `LAB_WEBSITE` varchar(100) DEFAULT 'https://EHRspeed.com',
  `LAB_LCMS_QC` varchar(255) DEFAULT 'QC2,QC3,QC5',
  `LAB_TAXONOMY` varchar(100) DEFAULT NULL,
  `LAB_DIRECTOR` varchar(100) DEFAULT NULL,
  `LAB_DIRECTOR_NPI` varchar(10) DEFAULT '0000000000',
  `LAB_DIRECTOR_CQ` varchar(50) DEFAULT NULL,
  `LAB_CONTACT` varchar(50) DEFAULT NULL,
  `LAB_CONTACT_PHONE` varchar(20) DEFAULT NULL,
  `LAB_CONTACT_EMAIL` varchar(100) DEFAULT NULL,
  `LAB_RESTRICTED_IPS` varchar(255) DEFAULT NULL,
  `LAB_REPORT_NOTE` mediumtext,
  `LAB_INSTRUMENT_COMM` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '0=None, 1=Viva E',
  `LAB_TOXIBOT_JOB_TYPE` int unsigned NOT NULL DEFAULT '0',
  `LAB_ECHO_SYSTEM` varchar(50) DEFAULT NULL,
  `LAB_ECHO_SFTP_ADDRESS` varchar(100) DEFAULT NULL,
  `LAB_ECHO_SFTP_PORT` int unsigned NOT NULL DEFAULT '22',
  `LAB_ECHO_SFTP_USER` varchar(50) DEFAULT NULL,
  `_LAB_ECHO_SFTP_PASSWORD` varbinary(255) DEFAULT NULL,
  `LAB_ECHO_SFTP_ORDERS` varchar(255) DEFAULT NULL,
  `LAB_ECHO_SFTP_RESULTS` varchar(255) DEFAULT NULL,
  `LAB_ECHO_SFTP_CANCELS` varchar(255) DEFAULT NULL,
  `LAB_BILLING_SYSTEM` varchar(50) DEFAULT NULL,
  `LAB_BILLING_SFTP_ADDRESS` varchar(100) DEFAULT NULL,
  `LAB_BILLING_SFTP_PORT` int unsigned NOT NULL DEFAULT '22',
  `LAB_BILLING_SFTP_USER` varchar(50) DEFAULT NULL,
  `_LAB_BILLING_SFTP_PASSWORD` varbinary(255) DEFAULT NULL,
  `LAB_BILLING_SFTP_CLAIMS` varchar(255) DEFAULT NULL,
  `LAB_BILLING_SFTP_RESPONSES` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`LAB_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_PACKAGES`
--

DROP TABLE IF EXISTS `LABS_PACKAGES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_PACKAGES` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `PACKAGE_NAME` varchar(50) NOT NULL DEFAULT '',
  `PACKAGE_SUCCESSOR` varchar(50) DEFAULT NULL,
  `PACKAGE_DETAIL` mediumtext,
  `DEPT_CODE` char(3) DEFAULT '',
  `HCPC_CODE` varchar(10) NOT NULL DEFAULT '',
  `SPECIMEN_TYPE` varchar(10) NOT NULL DEFAULT 'URINE',
  `PATIENT_TYPE` varchar(50) DEFAULT 'HUMAN',
  `PACKAGE_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `PACKAGE_MIN_UNITS` int unsigned NOT NULL DEFAULT '0',
  `PACKAGE_MAX_UNITS` int unsigned NOT NULL DEFAULT '0',
  `PACKAGE_PRICE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `PACKAGE_MINUTES` tinyint unsigned NOT NULL DEFAULT '5',
  `PACKAGE_CASH_ONLY` tinyint unsigned NOT NULL DEFAULT '0',
  `PACKAGE_DEFINITIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `PACKAGE_NAME_CONFIRMATION` varchar(50) DEFAULT NULL,
  `PACKAGE_SORT` int unsigned NOT NULL DEFAULT '0',
  `PACKAGE_DISCLAIMER` mediumtext,
  `PACKAGE_SHIPPED_MESSAGE` mediumtext,
  `PACKAGE_DENIAL_MESSAGE` mediumtext,
  `PACKAGE_REF_CODE` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`LAB_NPI`,`PACKAGE_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_PACKAGES_SERVICES`
--

DROP TABLE IF EXISTS `LABS_PACKAGES_SERVICES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_PACKAGES_SERVICES` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `PACKAGE_NAME` varchar(50) NOT NULL DEFAULT '',
  `SPECIMEN_TYPE` varchar(10) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '',
  `SERVICE_REFLEX` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_DEFINITIVE` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`LAB_NPI`,`PACKAGE_NAME`,`SPECIMEN_TYPE`,`SERVICE_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_PACKAGES_SERVICES_TARGETS`
--

DROP TABLE IF EXISTS `LABS_PACKAGES_SERVICES_TARGETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_PACKAGES_SERVICES_TARGETS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `PACKAGE_NAME` varchar(50) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '',
  `TARGET_NAME` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`LAB_NPI`,`PACKAGE_NAME`,`SERVICE_CODE`,`TARGET_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_PAYERS`
--

DROP TABLE IF EXISTS `LABS_PAYERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_PAYERS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `PAYER_CODE` varchar(20) NOT NULL DEFAULT '',
  PRIMARY KEY (`LAB_NPI`,`PAYER_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_PROFICIENCIES`
--

DROP TABLE IF EXISTS `LABS_PROFICIENCIES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_PROFICIENCIES` (
  `PROFICIENCY_ID` int NOT NULL AUTO_INCREMENT,
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `SPECIMEN_CODE` varchar(50) DEFAULT NULL,
  `SPECIMEN_LABEL` varchar(50) DEFAULT NULL,
  `SPECIMEN_TYPE` varchar(10) DEFAULT 'URINE',
  `SERVICE_TYPE` varchar(10) DEFAULT 'F',
  `SPECIMEN_CREATED` datetime DEFAULT NULL,
  `SPECIMEN_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PROFICIENCY_ID`),
  UNIQUE KEY `LK_LABS_LABELS` (`LAB_NPI`,`SPECIMEN_LABEL`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_SERVICES`
--

DROP TABLE IF EXISTS `LABS_SERVICES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_SERVICES` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '0000000000',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '',
  `SPECIMEN_TYPE` varchar(10) DEFAULT 'URINE' COMMENT 'URINE,SALIVA,SERUM,DRY-SERUM,DRY-URINE,DRY-BLOOD',
  `DEPT_CODE` char(3) DEFAULT NULL,
  `SERVICE_SPECIFICITY` char(2) DEFAULT 'P' COMMENT 'P = Presumptive,  D = Definitive',
  `SERVICE_ACRONYM` varchar(4) DEFAULT NULL,
  `SERVICE_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `SERVICE_NAME` varchar(50) DEFAULT NULL,
  `DRUG_CLASS` varchar(50) DEFAULT NULL,
  `HCPC_CODE_MCD` varchar(50) DEFAULT NULL,
  `HCPC_CODE_CMS` varchar(50) DEFAULT NULL,
  `SERVICE_LOINC_CODE` varchar(50) DEFAULT NULL,
  `SERVICE_METHODOLOGY` varchar(50) DEFAULT 'LC/MS/MS',
  `SERVICE_INSTRUMENT` varchar(50) DEFAULT 'Agilent 6460',
  `SERVICE_INSTRUMENT_CODE` varchar(50) DEFAULT '00',
  `SERVICE_CONTROLS` varchar(255) DEFAULT 'CALIBRATOR,POSITIVE,NEGATIVE',
  `SERVICE_UNITS` varchar(10) DEFAULT 'ng/mL',
  `SERVICE_L1` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L2` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L3` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L4` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L5` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L6` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L7` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L8` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L9` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_L10` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_LQC` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_MQC` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_HQC` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `SERVICE_CUTOFF_LEVEL` tinyint unsigned NOT NULL DEFAULT '3',
  `SERVICE_SEMIQUANT` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_CONFIRMABLE` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_CODE_CONFIRMATION` varchar(50) DEFAULT NULL,
  `SERVICE_VALIDITY` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_BOUTIQUE` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_DILUTION` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_PROCESS_TIME` time DEFAULT '00:00:00',
  `SERVICE_REF_NPI` varchar(10) DEFAULT NULL,
  `SERVICE_PRICE_CMS` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Usual Customary Price CMS',
  `SERVICE_PRICE_SELF` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Patient Self-Pay Price',
  `SERVICE_DAYS` decimal(10,2) unsigned NOT NULL DEFAULT '1.00',
  `SERVICE_DISCLAIMER` mediumtext,
  `SERVICE_DOH_REPORT` tinyint unsigned NOT NULL DEFAULT '0',
  `SERVICE_LOT` varchar(50) DEFAULT NULL COMMENT 'LOT NUMBER OF SERVICE COMPONENTS OR REAGENTS',
  PRIMARY KEY (`LAB_NPI`,`SERVICE_CODE`),
  UNIQUE KEY `LK_SERVICE_CODE` (`SERVICE_CODE`),
  KEY `KEY_ACRONYM_ACTIVE` (`SERVICE_ACRONYM`,`SERVICE_ACTIVE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_SERVICES_ATTRIBUTES`
--

DROP TABLE IF EXISTS `LABS_SERVICES_ATTRIBUTES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_SERVICES_ATTRIBUTES` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL,
  `ATTR_KEY` varchar(50) NOT NULL,
  `ATTR_VALUE` mediumtext,
  `ATTR_SECURE` blob,
  `ATTR_CREATED` datetime DEFAULT NULL,
  `ATTR_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ATTR_UPDATED` datetime DEFAULT NULL,
  `ATTR_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ATTR_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `ATTR_VISIBLE` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`LAB_NPI`,`SERVICE_CODE`,`ATTR_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_SERVICES_DIAGNOSES`
--

DROP TABLE IF EXISTS `LABS_SERVICES_DIAGNOSES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_SERVICES_DIAGNOSES` (
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '',
  `ICD_CODE` varchar(8) NOT NULL DEFAULT '',
  PRIMARY KEY (`SERVICE_CODE`,`ICD_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_SERVICES_TARGETS`
--

DROP TABLE IF EXISTS `LABS_SERVICES_TARGETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_SERVICES_TARGETS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '',
  `TARGET_NAME` varchar(50) NOT NULL DEFAULT '',
  `LST_CUTOFF` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `LST_RT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`LAB_NPI`,`SERVICE_CODE`,`TARGET_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LABS_USERS`
--

DROP TABLE IF EXISTS `LABS_USERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LABS_USERS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`LAB_NPI`,`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LEVEY_JENNINGS`
--

DROP TABLE IF EXISTS `LEVEY_JENNINGS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LEVEY_JENNINGS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `DRUG_NAME` varchar(50) NOT NULL DEFAULT '',
  `ACQ_DATE` date NOT NULL DEFAULT '0000-00-00',
  `CUTOFF` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `Q2` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `Q3` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `Q5` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `RT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `AREA` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`LAB_NPI`,`DRUG_NAME`,`ACQ_DATE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LOINC_CODES`
--

DROP TABLE IF EXISTS `LOINC_CODES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LOINC_CODES` (
  `LOINC_CODE` varchar(50) NOT NULL DEFAULT '',
  `LOINC_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `LOINC_COMPONENT` varchar(255) DEFAULT NULL,
  `LOINC_DESCRIPTION` varchar(255) DEFAULT NULL,
  `LOINC_ANALYTE` varchar(255) DEFAULT NULL,
  `LOINC_METHOD` varchar(255) DEFAULT NULL,
  `SPECIMEN_TYPE` varchar(50) DEFAULT NULL,
  `SPECIMEN_SNOMED` varchar(20) DEFAULT NULL,
  `SERVICE_SPECIFICITY` char(2) DEFAULT 'P',
  `LOINC_SNOMED_POS` varchar(20) DEFAULT NULL,
  `LOINC_SNOMED_NEG` varchar(20) DEFAULT NULL,
  `LOINC_SNOMED_INC` varchar(20) DEFAULT NULL,
  `LOINC_SNOMED_IND` varchar(20) DEFAULT NULL,
  `LOINC_SNOMED_INV` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`LOINC_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MEDIA`
--

DROP TABLE IF EXISTS `MEDIA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MEDIA` (
  `MEDIA_ID` int NOT NULL AUTO_INCREMENT,
  `MEDIA_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `MEDIA_CREATED` datetime DEFAULT NULL,
  `MEDIA_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `MEDIA_UPDATED` datetime DEFAULT NULL,
  `MEDIA_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `MEDIA_DESCRIPTION` varchar(255) DEFAULT NULL,
  `MEDIA_MIME_TYPE` varchar(50) DEFAULT NULL,
  `MEDIA_PATH` varchar(255) DEFAULT NULL,
  `MEDIA_FILENAME` varchar(100) DEFAULT NULL,
  `MEDIA_BYTES` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`MEDIA_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MEDICAL_NECESSITY_CRITERIA`
--

DROP TABLE IF EXISTS `MEDICAL_NECESSITY_CRITERIA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MEDICAL_NECESSITY_CRITERIA` (
  `MNC_CODE` varchar(20) NOT NULL DEFAULT '',
  `MNC_DESCRIPTION` varchar(255) DEFAULT '',
  `MNC_DESC_LONG` mediumtext,
  PRIMARY KEY (`MNC_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `METRICS`
--

DROP TABLE IF EXISTS `METRICS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `METRICS` (
  `TRAFFIC_CREATED` date NOT NULL DEFAULT '0000-00-00',
  `QUAN` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`TRAFFIC_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `METRICS_PRODUCTION`
--

DROP TABLE IF EXISTS `METRICS_PRODUCTION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `METRICS_PRODUCTION` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `ORDER_ACCESSION_DATE` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `QUAN` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`LAB_NPI`,`ORDER_ACCESSION_DATE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `NDC`
--

DROP TABLE IF EXISTS `NDC`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NDC` (
  `NDC` varchar(50) NOT NULL,
  `NAME` varchar(255) DEFAULT NULL,
  `TYPE` varchar(50) DEFAULT NULL,
  `GEN CODE` varchar(50) DEFAULT NULL,
  `PACKAGER` varchar(50) DEFAULT NULL,
  `TAX` char(2) DEFAULT NULL,
  `DEA` tinyint unsigned NOT NULL DEFAULT '0',
  `OBS` char(2) DEFAULT NULL,
  `340B` char(2) DEFAULT NULL,
  `PBP` char(2) DEFAULT NULL,
  `FORM` varchar(50) DEFAULT NULL,
  `STRENGTH` varchar(50) DEFAULT NULL,
  `ONHAND` int NOT NULL DEFAULT '0',
  `RO PT` int NOT NULL DEFAULT '0',
  `RO QTY` int NOT NULL DEFAULT '0',
  `DS` int NOT NULL DEFAULT '0',
  `PACKSIZE` int NOT NULL DEFAULT '0',
  `CASESIZE` int unsigned NOT NULL DEFAULT '0',
  `WAC` double DEFAULT NULL,
  `AWP` double DEFAULT NULL,
  `MAC` double DEFAULT NULL,
  `COST` double DEFAULT NULL,
  `VENDOR 1` varchar(50) DEFAULT NULL,
  `VN 1` varchar(50) DEFAULT NULL,
  `VENDOR 2` varchar(50) DEFAULT NULL,
  `VN 2` varchar(50) DEFAULT NULL,
  `PRICE 1` varchar(20) DEFAULT NULL,
  `PRICE 2` varchar(20) DEFAULT NULL,
  `PRICE 3` varchar(20) DEFAULT NULL,
  `FIXED UNITS` int unsigned NOT NULL DEFAULT '0',
  `FIXED PRICE` varchar(20) DEFAULT NULL,
  `CAT` tinyint unsigned DEFAULT NULL,
  `REORDER ON` varchar(50) DEFAULT NULL,
  `PO GROUP` varchar(50) DEFAULT NULL,
  `PUC` int unsigned NOT NULL DEFAULT '0',
  `INV INACTIVE` int unsigned NOT NULL DEFAULT '0',
  `DF UOM` varchar(50) DEFAULT NULL,
  `DRUG MEMO` mediumtext,
  `AWP UPD FLG` char(2) DEFAULT NULL,
  `MAC UPD FLG` char(2) DEFAULT NULL,
  `WAC UPD FLG` char(2) DEFAULT NULL,
  `ACT COST UPD FLG` char(2) DEFAULT NULL,
  PRIMARY KEY (`NDC`),
  KEY `LK_NAME` (`NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `NOTICES`
--

DROP TABLE IF EXISTS `NOTICES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NOTICES` (
  `NOTICE_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `NOTICE_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `NOTICE_CREATED` datetime DEFAULT NULL,
  `NOTICE_UPDATED` datetime DEFAULT NULL,
  `USER_ID` int unsigned DEFAULT '0',
  `PROJECT_ID` int unsigned NOT NULL DEFAULT '0',
  `NOTICE_TITLE` varchar(50) DEFAULT NULL,
  `NOTICE_ICON` varchar(50) DEFAULT NULL,
  `NOTICE_DETAIL` mediumtext,
  `NOTICE_VISIBILITY` tinyint unsigned DEFAULT '1' COMMENT '0=Private, 1=Team, 2=Guests',
  PRIMARY KEY (`NOTICE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS`
--

DROP TABLE IF EXISTS `ORDERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS` (
  `ORDER_ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT '*** PRIMARY KEY ***',
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FOREIGN KEY --> SPECIMENS ***',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL COMMENT '*** FOREIGN KEY --> PROGRAMS ***',
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `ORDER_PRIOR_COUNT` int unsigned NOT NULL DEFAULT '0' COMMENT 'COUNT OF PRIOR ORDERS PLACED FOR THIS SPECIMEN',
  `ORDER_ACTIVE` tinyint unsigned DEFAULT '1' COMMENT 'VISIBLE/INVISIBLE (PSEUDO DELETE)',
  `ORDER_CREATED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF INITIAL ORDER',
  `ORDER_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF INITIAL ORDERER',
  `ORDER_CREATED_COMMENT` mediumtext COMMENT 'INSTRUCTIONS FROM USER TO LAB',
  `ORDER_CREATED_CHARGE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Sender''s Reported Payment Amount',
  `ORDER_CREATED_PRACTITIONER_NPI` varchar(10) DEFAULT NULL COMMENT 'NPI OF ORDERING PROVIDER',
  `ORDER_CREATED_DA` varchar(100) DEFAULT NULL COMMENT 'FILENAME OF DESIGNATION OF AUTHORITY',
  `ORDER_CREATED_RX_LIST` mediumtext,
  `ORDER_CREATED_DX_CODES` varchar(255) DEFAULT NULL COMMENT 'Comma delimited list of ICD-10 diagnosis codes',
  `ORDER_CREATED_MEDICAL_NECESSITY` mediumtext,
  `ORDER_UPDATED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF LAST MODIFICATION',
  `ORDER_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF LAST MODIFIER',
  `PATIENT_ID` int unsigned DEFAULT '0',
  `PATIENT_ENCOUNTER` date DEFAULT NULL,
  `ANIMAL_ID` int unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE_1` varchar(20) NOT NULL DEFAULT 'DIRECT' COMMENT 'FK PAYERS',
  `PAYER_CODE_2` varchar(20) DEFAULT NULL COMMENT 'FK PAYERS',
  `ORDER_SHIPPED_DATE` datetime DEFAULT NULL,
  `ORDER_SHIPPED_USER_ID` int unsigned DEFAULT '0',
  `ORDER_SHIPPED_TRACKING` varchar(255) DEFAULT NULL,
  `ORDER_RECEIVED_DATE` datetime DEFAULT NULL COMMENT 'Timestamp of most recent scan at laboratory',
  `ORDER_RECEIVED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of lab personnel who last scanned order',
  `ORDER_RECEIVED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Receiver''s Reported Payment Amount',
  `ORDER_RECEIVED_BANGTAIL` tinyint unsigned DEFAULT '0' COMMENT 'Bangtail Indicator',
  `ORDER_ACCESSION_DATE` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF START OF PROCESSING AT LAB',
  `ORDER_ACCESSION_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF ACCESSIONER',
  `ORDER_ACCESSION_NUMBER` varchar(12) DEFAULT NULL COMMENT 'YYYY + MM + DD + BATCH SEQUENCE',
  `ORDER_REF_LAB_NPI` varchar(50) DEFAULT NULL COMMENT 'Reference Lab NPI',
  `ORDER_REF_SHIP_DATE` datetime DEFAULT NULL COMMENT 'Timestamp of shipment of aliquot to reference lab',
  `ORDER_REF_SHIP_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of who shipped aliquot',
  `ORDER_REF_SHIP_LAB` varchar(50) DEFAULT NULL COMMENT 'Name of reference lab',
  `ORDER_PUBLISHED` datetime DEFAULT NULL COMMENT 'Timestamp of most recent Publication',
  `ORDER_PUBLISHED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of last result publisher',
  `ORDER_PUBLISHED_COMMENT` mediumtext,
  `ORDER_REVIEWED` datetime DEFAULT NULL,
  `ORDER_REVIEWED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HISTORY` mediumtext,
  `ORDER_DIRECT_BILL_LOCK` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Order is locked for Direct Bill ONLY',
  `ORDER_DIRECT_BILL_DATE` datetime DEFAULT NULL,
  `ORDER_DIRECT_BILL_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HOLD_CLAIM` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_ABNORMAL` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_STATUS` varchar(50) DEFAULT 'NEW',
  `ORDER_STATUS_UPDATED` datetime DEFAULT NULL,
  `ORDER_STATUS_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HL7_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_SFTP_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_FAX_SENT` datetime DEFAULT NULL,
  `ORDER_FAX_RECEIPT` varchar(255) DEFAULT NULL,
  `ORDER_ALERT_SENT` datetime DEFAULT NULL,
  `ORDER_INVOICE_DATE` date DEFAULT NULL,
  `ORDER_FLAG_STAT` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_FLAG_CORRECTED` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_FLAG_AMENDED` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_ECHO_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_ECHO_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_CANCEL_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_CANCEL_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_SMS_NUMBER` varchar(20) DEFAULT NULL,
  `ORDER_SMS_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_RESULT_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_SMS_SID` varchar(255) DEFAULT NULL,
  `ORDER_REPORT_OPENED` datetime DEFAULT NULL,
  `ORDER_REPORTED_DOH` datetime DEFAULT NULL,
  `ORDER_CLAIM_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_CLAIM_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_CLAIM_STATUS` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ORDER_ID`),
  UNIQUE KEY `SPECIMENS_PACKAGES` (`SPECIMEN_CODE`,`PACKAGE_NAME`),
  KEY `KEY_SPECIMEN` (`SPECIMEN_CODE`),
  KEY `KEY_ACCESSION` (`ORDER_ACCESSION_NUMBER`),
  KEY `KEY_ACC_USER` (`ORDER_ACCESSION_USER_ID`),
  KEY `KEY_PUB_USER` (`ORDER_PUBLISHED_USER_ID`),
  KEY `KEY_LAB` (`LAB_NPI`),
  KEY `LK_TRANSMITTED` (`ORDER_HL7_TRANSMITTED`),
  KEY `LK_REVIEWED` (`ORDER_REVIEWED_USER_ID`),
  KEY `LK_ECHO_TX` (`ORDER_ECHO_TRANSMITTED`),
  KEY `KEY_AGENCY` (`AGENCY_CODE`),
  KEY `LK_BILLED` (`ORDER_CLAIM_TRANSMITTED`),
  KEY `LK_CLAIM_STATUS` (`ORDER_CLAIM_STATUS`),
  KEY `LK_ALERT` (`ORDER_ALERT_SENT`),
  KEY `LK_OPENED` (`ORDER_REPORT_OPENED`),
  KEY `KEY_STATUS_TRANSMITTED` (`ORDER_STATUS`(5),`ORDER_SMS_TRANSMITTED`),
  KEY `LK_RESULT_XMIT` (`ORDER_RESULT_TRANSMITTED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_ARCHIVES`
--

DROP TABLE IF EXISTS `ORDERS_ARCHIVES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_ARCHIVES` (
  `ORDER_ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT '*** PRIMARY KEY ***',
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FOREIGN KEY --> SPECIMENS ***',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL COMMENT '*** FOREIGN KEY --> PROGRAMS ***',
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `ORDER_PRIOR_COUNT` int unsigned NOT NULL DEFAULT '0' COMMENT 'COUNT OF PRIOR ORDERS PLACED FOR THIS SPECIMEN',
  `ORDER_ACTIVE` tinyint unsigned DEFAULT '1' COMMENT 'VISIBLE/INVISIBLE (PSEUDO DELETE)',
  `ORDER_CREATED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF INITIAL ORDER',
  `ORDER_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF INITIAL ORDERER',
  `ORDER_CREATED_COMMENT` mediumtext COMMENT 'INSTRUCTIONS FROM USER TO LAB',
  `ORDER_CREATED_CHARGE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Sender''s Reported Payment Amount',
  `ORDER_CREATED_PRACTITIONER_NPI` varchar(10) DEFAULT NULL COMMENT 'NPI OF ORDERING PROVIDER',
  `ORDER_CREATED_DA` varchar(100) DEFAULT NULL COMMENT 'FILENAME OF DESIGNATION OF AUTHORITY',
  `ORDER_CREATED_RX_LIST` mediumtext,
  `ORDER_CREATED_DX_CODES` varchar(255) DEFAULT NULL COMMENT 'Comma delimited list of ICD-10 diagnosis codes',
  `ORDER_CREATED_MEDICAL_NECESSITY` mediumtext,
  `ORDER_UPDATED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF LAST MODIFICATION',
  `ORDER_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF LAST MODIFIER',
  `PATIENT_ID` int unsigned DEFAULT '0',
  `PATIENT_ENCOUNTER` date DEFAULT NULL,
  `ANIMAL_ID` int unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE_1` varchar(20) NOT NULL DEFAULT 'DIRECT' COMMENT 'FK PAYERS',
  `PAYER_CODE_2` varchar(20) DEFAULT NULL COMMENT 'FK PAYERS',
  `ORDER_SHIPPED_DATE` datetime DEFAULT NULL,
  `ORDER_SHIPPED_USER_ID` int unsigned DEFAULT '0',
  `ORDER_SHIPPED_TRACKING` varchar(255) DEFAULT NULL,
  `ORDER_RECEIVED_DATE` datetime DEFAULT NULL COMMENT 'Timestamp of most recent scan at laboratory',
  `ORDER_RECEIVED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of lab personnel who last scanned order',
  `ORDER_RECEIVED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Receiver''s Reported Payment Amount',
  `ORDER_RECEIVED_BANGTAIL` tinyint unsigned DEFAULT '0' COMMENT 'Bangtail Indicator',
  `ORDER_ACCESSION_DATE` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF START OF PROCESSING AT LAB',
  `ORDER_ACCESSION_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF ACCESSIONER',
  `ORDER_ACCESSION_NUMBER` varchar(12) DEFAULT NULL COMMENT 'YYYY + MM + DD + BATCH SEQUENCE',
  `ORDER_REF_LAB_NPI` varchar(50) DEFAULT NULL COMMENT 'Reference Lab NPI',
  `ORDER_REF_SHIP_DATE` datetime DEFAULT NULL COMMENT 'Timestamp of shipment of aliquot to reference lab',
  `ORDER_REF_SHIP_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of who shipped aliquot',
  `ORDER_REF_SHIP_LAB` varchar(50) DEFAULT NULL COMMENT 'Name of reference lab',
  `ORDER_PUBLISHED` datetime DEFAULT NULL COMMENT 'Timestamp of most recent Publication',
  `ORDER_PUBLISHED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of last result publisher',
  `ORDER_PUBLISHED_COMMENT` mediumtext,
  `ORDER_REVIEWED` datetime DEFAULT NULL,
  `ORDER_REVIEWED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HISTORY` mediumtext,
  `ORDER_DIRECT_BILL_LOCK` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Order is locked for Direct Bill ONLY',
  `ORDER_DIRECT_BILL_DATE` datetime DEFAULT NULL,
  `ORDER_DIRECT_BILL_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HOLD_CLAIM` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_ABNORMAL` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_STATUS` varchar(50) DEFAULT 'NEW',
  `ORDER_STATUS_UPDATED` datetime DEFAULT NULL,
  `ORDER_STATUS_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HL7_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_SFTP_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_FAX_SENT` datetime DEFAULT NULL,
  `ORDER_FAX_RECEIPT` varchar(255) DEFAULT NULL,
  `ORDER_ALERT_SENT` datetime DEFAULT NULL,
  `ORDER_INVOICE_DATE` date DEFAULT NULL,
  `ORDER_FLAG_STAT` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_FLAG_CORRECTED` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_FLAG_AMENDED` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_ECHO_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_ECHO_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_CANCEL_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_CANCEL_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_SMS_NUMBER` varchar(20) DEFAULT NULL,
  `ORDER_SMS_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_RESULT_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_SMS_SID` varchar(255) DEFAULT NULL,
  `ORDER_REPORT_OPENED` datetime DEFAULT NULL,
  `ORDER_REPORTED_DOH` datetime DEFAULT NULL,
  `ORDER_CLAIM_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_CLAIM_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_CLAIM_STATUS` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ORDER_ID`),
  UNIQUE KEY `SPECIMENS_PACKAGES` (`SPECIMEN_CODE`,`PACKAGE_NAME`),
  KEY `KEY_SPECIMEN` (`SPECIMEN_CODE`),
  KEY `KEY_ACCESSION` (`ORDER_ACCESSION_NUMBER`),
  KEY `KEY_ACC_USER` (`ORDER_ACCESSION_USER_ID`),
  KEY `KEY_PUB_USER` (`ORDER_PUBLISHED_USER_ID`),
  KEY `KEY_LAB` (`LAB_NPI`),
  KEY `LK_ABNORMAL` (`ORDER_ABNORMAL`),
  KEY `LK_TRANSMITTED` (`ORDER_HL7_TRANSMITTED`),
  KEY `LK_REVIEWED` (`ORDER_REVIEWED_USER_ID`),
  KEY `LK_ECHO_TX` (`ORDER_ECHO_TRANSMITTED`),
  KEY `KEY_AGENCY` (`AGENCY_CODE`),
  KEY `LK_BILLED` (`ORDER_CLAIM_TRANSMITTED`),
  KEY `LK_OPRAC` (`ORDER_CREATED_PRACTITIONER_NPI`),
  KEY `LK_CLAIM_STATUS` (`ORDER_CLAIM_STATUS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_CANCELLED`
--

DROP TABLE IF EXISTS `ORDERS_CANCELLED`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_CANCELLED` (
  `ORDER_ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT '*** PRIMARY KEY ***',
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FOREIGN KEY --> SPECIMENS ***',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL COMMENT '*** FOREIGN KEY --> PROGRAMS ***',
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `ORDER_PRIOR_COUNT` int unsigned NOT NULL DEFAULT '0' COMMENT 'COUNT OF PRIOR ORDERS PLACED FOR THIS SPECIMEN',
  `ORDER_ACTIVE` tinyint unsigned DEFAULT '1' COMMENT 'VISIBLE/INVISIBLE (PSEUDO DELETE)',
  `ORDER_CREATED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF INITIAL ORDER',
  `ORDER_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF INITIAL ORDERER',
  `ORDER_CREATED_COMMENT` mediumtext COMMENT 'INSTRUCTIONS FROM USER TO LAB',
  `ORDER_CREATED_CHARGE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Sender''s Reported Payment Amount',
  `ORDER_CREATED_PRACTITIONER_NPI` varchar(10) DEFAULT NULL COMMENT 'NPI OF ORDERING PROVIDER',
  `ORDER_CREATED_DA` varchar(100) DEFAULT NULL COMMENT 'FILENAME OF DESIGNATION OF AUTHORITY',
  `ORDER_CREATED_RX_LIST` mediumtext,
  `ORDER_CREATED_DX_CODES` varchar(255) DEFAULT NULL COMMENT 'Comma delimited list of ICD-10 diagnosis codes',
  `ORDER_CREATED_MEDICAL_NECESSITY` mediumtext,
  `ORDER_UPDATED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF LAST MODIFICATION',
  `ORDER_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF LAST MODIFIER',
  `PATIENT_ID` int unsigned DEFAULT '0',
  `PATIENT_ENCOUNTER` date DEFAULT NULL,
  `ANIMAL_ID` int unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE_1` varchar(20) NOT NULL DEFAULT 'DIRECT' COMMENT 'FK PAYERS',
  `PAYER_CODE_2` varchar(20) DEFAULT NULL COMMENT 'FK PAYERS',
  `ORDER_SHIPPED_DATE` datetime DEFAULT NULL,
  `ORDER_SHIPPED_USER_ID` int unsigned DEFAULT '0',
  `ORDER_SHIPPED_TRACKING` varchar(255) DEFAULT NULL,
  `ORDER_RECEIVED_DATE` datetime DEFAULT NULL COMMENT 'Timestamp of most recent scan at laboratory',
  `ORDER_RECEIVED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of lab personnel who last scanned order',
  `ORDER_RECEIVED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'Receiver''s Reported Payment Amount',
  `ORDER_RECEIVED_BANGTAIL` tinyint unsigned DEFAULT '0' COMMENT 'Bangtail Indicator',
  `ORDER_ACCESSION_DATE` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF START OF PROCESSING AT LAB',
  `ORDER_ACCESSION_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID OF ACCESSIONER',
  `ORDER_ACCESSION_NUMBER` varchar(12) DEFAULT NULL COMMENT 'YYYY + MM + DD + BATCH SEQUENCE',
  `ORDER_REF_LAB_NPI` varchar(50) DEFAULT NULL COMMENT 'Reference Lab NPI',
  `ORDER_REF_SHIP_DATE` datetime DEFAULT NULL COMMENT 'Timestamp of shipment of aliquot to reference lab',
  `ORDER_REF_SHIP_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of who shipped aliquot',
  `ORDER_REF_SHIP_LAB` varchar(50) DEFAULT NULL COMMENT 'Name of reference lab',
  `ORDER_PUBLISHED` datetime DEFAULT NULL COMMENT 'Timestamp of most recent Publication',
  `ORDER_PUBLISHED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'USER_ID of last result publisher',
  `ORDER_PUBLISHED_COMMENT` mediumtext,
  `ORDER_REVIEWED` datetime DEFAULT NULL,
  `ORDER_REVIEWED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HISTORY` mediumtext,
  `ORDER_DIRECT_BILL_LOCK` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Order is locked for Direct Bill ONLY',
  `ORDER_DIRECT_BILL_DATE` datetime DEFAULT NULL,
  `ORDER_DIRECT_BILL_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HOLD_CLAIM` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_ABNORMAL` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_STATUS` varchar(50) DEFAULT 'NEW',
  `ORDER_STATUS_UPDATED` datetime DEFAULT NULL,
  `ORDER_STATUS_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ORDER_HL7_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_SFTP_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_FAX_SENT` datetime DEFAULT NULL,
  `ORDER_FAX_RECEIPT` varchar(255) DEFAULT NULL,
  `ORDER_ALERT_SENT` datetime DEFAULT NULL,
  `ORDER_INVOICE_DATE` date DEFAULT NULL,
  `ORDER_FLAG_STAT` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_FLAG_CORRECTED` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_FLAG_AMENDED` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_ECHO_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_ECHO_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_CANCEL_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_CANCEL_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_SMS_NUMBER` varchar(20) DEFAULT NULL,
  `ORDER_SMS_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_RESULT_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_SMS_SID` varchar(255) DEFAULT NULL,
  `ORDER_REPORT_OPENED` datetime DEFAULT NULL,
  `ORDER_REPORTED_DOH` datetime DEFAULT NULL,
  `ORDER_CLAIM_TRANSMITTED` datetime DEFAULT NULL,
  `ORDER_CLAIM_FILENAME` varchar(255) DEFAULT NULL,
  `ORDER_CLAIM_STATUS` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ORDER_ID`),
  UNIQUE KEY `SPECIMENS_PACKAGES` (`SPECIMEN_CODE`,`PACKAGE_NAME`),
  KEY `KEY_SPECIMEN` (`SPECIMEN_CODE`),
  KEY `KEY_ACCESSION` (`ORDER_ACCESSION_NUMBER`),
  KEY `KEY_ACC_USER` (`ORDER_ACCESSION_USER_ID`),
  KEY `KEY_PUB_USER` (`ORDER_PUBLISHED_USER_ID`),
  KEY `KEY_LAB` (`LAB_NPI`),
  KEY `LK_ABNORMAL` (`ORDER_ABNORMAL`),
  KEY `LK_TRANSMITTED` (`ORDER_HL7_TRANSMITTED`),
  KEY `LK_REVIEWED` (`ORDER_REVIEWED_USER_ID`),
  KEY `LK_ECHO_TX` (`ORDER_ECHO_TRANSMITTED`),
  KEY `KEY_AGENCY` (`AGENCY_CODE`),
  KEY `LK_BILLED` (`ORDER_CLAIM_TRANSMITTED`),
  KEY `LK_OPRAC` (`ORDER_CREATED_PRACTITIONER_NPI`),
  KEY `LK_CLAIM_STATUS` (`ORDER_CLAIM_STATUS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_MIA`
--

DROP TABLE IF EXISTS `ORDERS_MIA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_MIA` (
  `SPECIMEN_CODE` varchar(11) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `SERVICE_CODE` char(0) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `PATIENT_LNAME` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `PATIENT_FNAME` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `OS_RESULT_CODE` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `OS_RESULT_DATE` varchar(19) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_SERVICES`
--

DROP TABLE IF EXISTS `ORDERS_SERVICES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_SERVICES` (
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FORIEGN KEY --> SERVICES',
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT '*** FOREIGN KEY --> ORDERS',
  `OS_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'FOR SOFT DELETION OF SERVICES 1=ACTIVE 0=DEACTIVATED',
  `OS_CONFIRM` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'CONFIRMATION REQUESTED',
  `SERVICE_CODE_INITIAL` varchar(50) DEFAULT NULL COMMENT 'FOR CONF TO LINK BACK TO ORIG',
  `OS_RESULT_DATE` datetime DEFAULT NULL,
  `OS_RESULT_CODE` varchar(20) DEFAULT 'PEN' COMMENT 'PEN, NEG, POS, H-P, M-P, L-P, QNS, INV, ERR',
  `OS_RESULT_QUANT` varchar(20) DEFAULT NULL COMMENT 'NUMERIC VALUE OF RESULT (IF APPLICABLE)',
  `OS_RESULT_COMMENT` mediumtext COMMENT 'AUTOMATIC OR MANUAL COMMENTS',
  `OS_RESULT_RAW` mediumtext COMMENT 'INSTRUMENT RESULT OUTPUT',
  `OS_RESULT_UPDATED` datetime DEFAULT NULL,
  `OS_RESULT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `OS_PUBLISHED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF OFFICIAL RESULT PUBLICATION',
  `OS_PUBLISHED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'CERTIFYING SCIENTIST USER_ID',
  `OS_NC` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'NO-CHARGE FLAG (e.g. QNS)',
  `OS_INCONSISTENT` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'INDICATES UNEXPECTED POSITVE OR NEGATIVE FOR THIS TEST',
  `AGENCY_PRICE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'MOMENTARY PRICE OF SERVICE FOR ORDERING AGENCY',
  `SERVICE_LOT` varchar(50) DEFAULT NULL COMMENT 'LOT NUMBER OF SERVICE COMPONENTS OR REAGENTS',
  PRIMARY KEY (`SPECIMEN_CODE`,`SERVICE_CODE`),
  KEY `LK_NC_FLAG` (`OS_NC`),
  KEY `LK_SERVICE_INITIAL` (`SERVICE_CODE_INITIAL`),
  KEY `FK_ORDERS` (`ORDER_ID`),
  KEY `LK_INCONSISTENT` (`OS_INCONSISTENT`),
  KEY `KEY_ORDER_SERVICE` (`ORDER_ID`,`SERVICE_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_SERVICES_ARCHIVES`
--

DROP TABLE IF EXISTS `ORDERS_SERVICES_ARCHIVES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_SERVICES_ARCHIVES` (
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FORIEGN KEY --> SERVICES',
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT '*** FOREIGN KEY --> ORDERS',
  `OS_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'FOR SOFT DELETION OF SERVICES 1=ACTIVE 0=DEACTIVATED',
  `OS_CONFIRM` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'CONFIRMATION REQUESTED',
  `SERVICE_CODE_INITIAL` varchar(50) DEFAULT NULL COMMENT 'FOR CONF TO LINK BACK TO ORIG',
  `OS_RESULT_DATE` datetime DEFAULT NULL,
  `OS_RESULT_CODE` varchar(10) DEFAULT 'PEN' COMMENT 'PEN, NEG, POS, H-P, M-P, L-P, QNS, INV, ERR',
  `OS_RESULT_QUANT` varchar(20) DEFAULT NULL COMMENT 'NUMERIC VALUE OF RESULT (IF APPLICABLE)',
  `OS_RESULT_COMMENT` mediumtext COMMENT 'AUTOMATIC OR MANUAL COMMENTS',
  `OS_RESULT_RAW` mediumtext COMMENT 'INSTRUMENT RESULT OUTPUT',
  `OS_RESULT_UPDATED` datetime DEFAULT NULL,
  `OS_RESULT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `OS_PUBLISHED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF OFFICIAL RESULT PUBLICATION',
  `OS_PUBLISHED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'CERTIFYING SCIENTIST USER_ID',
  `OS_NC` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'NO-CHARGE FLAG (e.g. QNS)',
  `OS_INCONSISTENT` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'INDICATES UNEXPECTED POSITVE OR NEGATIVE FOR THIS TEST',
  `AGENCY_PRICE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'MOMENTARY PRICE OF SERVICE FOR ORDERING AGENCY',
  `SERVICE_LOT` varchar(50) DEFAULT NULL COMMENT 'LOT NUMBER OF SERVICE COMPONENTS OR REAGENTS',
  PRIMARY KEY (`SPECIMEN_CODE`,`SERVICE_CODE`),
  KEY `LK_NC_FLAG` (`OS_NC`),
  KEY `LK_SERVICE_INITIAL` (`SERVICE_CODE_INITIAL`),
  KEY `FK_ORDERS` (`ORDER_ID`),
  KEY `LK_INCONSISTENT` (`OS_INCONSISTENT`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_SERVICES_CANCELLED`
--

DROP TABLE IF EXISTS `ORDERS_SERVICES_CANCELLED`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_SERVICES_CANCELLED` (
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FORIEGN KEY --> SERVICES',
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT '*** FOREIGN KEY --> ORDERS',
  `OS_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'FOR SOFT DELETION OF SERVICES 1=ACTIVE 0=DEACTIVATED',
  `OS_CONFIRM` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'CONFIRMATION REQUESTED',
  `SERVICE_CODE_INITIAL` varchar(50) DEFAULT NULL COMMENT 'FOR CONF TO LINK BACK TO ORIG',
  `OS_RESULT_DATE` datetime DEFAULT NULL,
  `OS_RESULT_CODE` varchar(10) DEFAULT 'PEN' COMMENT 'PEN, NEG, POS, H-P, M-P, L-P, QNS, INV, ERR',
  `OS_RESULT_QUANT` varchar(20) DEFAULT NULL COMMENT 'NUMERIC VALUE OF RESULT (IF APPLICABLE)',
  `OS_RESULT_COMMENT` mediumtext COMMENT 'AUTOMATIC OR MANUAL COMMENTS',
  `OS_RESULT_RAW` mediumtext COMMENT 'INSTRUMENT RESULT OUTPUT',
  `OS_RESULT_UPDATED` datetime DEFAULT NULL,
  `OS_RESULT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `OS_PUBLISHED` datetime DEFAULT NULL COMMENT 'TIMESTAMP OF OFFICIAL RESULT PUBLICATION',
  `OS_PUBLISHED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'CERTIFYING SCIENTIST USER_ID',
  `OS_NC` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'NO-CHARGE FLAG (e.g. QNS)',
  `OS_INCONSISTENT` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'INDICATES UNEXPECTED POSITVE OR NEGATIVE FOR THIS TEST',
  `AGENCY_PRICE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT 'MOMENTARY PRICE OF SERVICE FOR ORDERING AGENCY',
  `SERVICE_LOT` varchar(50) DEFAULT NULL COMMENT 'LOT NUMBER OF SERVICE COMPONENTS OR REAGENTS'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_SERVICES_TARGETS`
--

DROP TABLE IF EXISTS `ORDERS_SERVICES_TARGETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_SERVICES_TARGETS` (
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT '*** FOREIGN KEY --> ORDERS',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FORIEGN KEY --> SERVICES',
  `TARGET_NAME` varchar(255) NOT NULL DEFAULT '' COMMENT '*** FOREIGN KEY --> TARGETS',
  `OST_RESULT_DATE` datetime DEFAULT NULL COMMENT 'TIMESTAMP RESULT RECEIVED',
  `OST_RESULT_CODE` varchar(10) DEFAULT 'NEG' COMMENT 'PEN, NEG, POS, H-P, M-P, L-P, QNS, INV, ERR',
  `OST_RESULT_QUANT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'NUMERIC VALUE',
  `OST_RESULT_COMMENT` mediumtext COMMENT 'AUTOMATIC OR MANUAL COMMENTS',
  `OST_RESULT_RAW` mediumtext COMMENT 'RAW INSTRUMENT OUTPUT',
  `OST_RT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'Retention Time',
  `OST_SN` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'Signal to Noise Ratio',
  `OST_AREA` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'Area',
  `OST_RESULT_QC` mediumtext COMMENT 'AUTOMATIC INTEGRATION COMMENTS AND WARNINGS',
  `OST_RX` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'TARGET MATCHES PATIENT PRESCRIPTION',
  PRIMARY KEY (`ORDER_ID`,`SERVICE_CODE`,`TARGET_NAME`),
  KEY `LK_RX` (`OST_RX`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ORDERS_SERVICES_TARGETS_ARCHIVES`
--

DROP TABLE IF EXISTS `ORDERS_SERVICES_TARGETS_ARCHIVES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS_SERVICES_TARGETS_ARCHIVES` (
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT '*** FOREIGN KEY --> ORDERS',
  `SERVICE_CODE` varchar(50) NOT NULL DEFAULT '' COMMENT '*** FORIEGN KEY --> SERVICES',
  `TARGET_NAME` varchar(255) NOT NULL DEFAULT '' COMMENT '*** FOREIGN KEY --> TARGETS',
  `OST_RESULT_DATE` datetime DEFAULT NULL COMMENT 'TIMESTAMP RESULT RECEIVED',
  `OST_RESULT_CODE` varchar(10) DEFAULT 'NEG' COMMENT 'PEN, NEG, POS, H-P, M-P, L-P, QNS, INV, ERR',
  `OST_RESULT_QUANT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'NUMERIC VALUE',
  `OST_RESULT_COMMENT` mediumtext COMMENT 'AUTOMATIC OR MANUAL COMMENTS',
  `OST_RESULT_RAW` mediumtext COMMENT 'RAW INSTRUMENT OUTPUT',
  `OST_RT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'Retention Time',
  `OST_SN` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'Signal to Noise Ratio',
  `OST_AREA` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT 'Area',
  `OST_RESULT_QC` mediumtext COMMENT 'AUTOMATIC INTEGRATION COMMENTS AND WARNINGS',
  `OST_RX` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'TARGET MATCHES PATIENT PRESCRIPTION',
  PRIMARY KEY (`ORDER_ID`,`SERVICE_CODE`,`TARGET_NAME`),
  KEY `LK_RX` (`OST_RX`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS`
--

DROP TABLE IF EXISTS `PATIENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS` (
  `PATIENT_ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Incremental Serial Number',
  `PATIENT_FAMILY_KEY` varchar(20) DEFAULT NULL,
  `PATIENT_CREATED` varchar(22) DEFAULT NULL COMMENT 'Date and Time of Record Creation',
  `PATIENT_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'User ID who created initial record',
  `PATIENT_UPDATED` varchar(22) DEFAULT NULL COMMENT 'Date and Time of Last Update',
  `PATIENT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'User ID who made last change',
  `PATIENT_LASTACTIVE` varchar(22) DEFAULT NULL COMMENT 'Timestamp updated on each order',
  `_PATIENT_FNAME` varbinary(100) DEFAULT NULL COMMENT 'Patient First Name',
  `_PATIENT_MNAME` varbinary(100) DEFAULT NULL COMMENT 'Patient Middle Name (optional)',
  `_PATIENT_LNAME` varbinary(100) DEFAULT NULL COMMENT 'Patient Last Name',
  `_PATIENT_SUFFIX` varbinary(50) DEFAULT NULL COMMENT 'Patient Suffix',
  `_PATIENT_ALIAS` varbinary(100) DEFAULT NULL,
  `_PATIENT_STREET1` varbinary(100) DEFAULT NULL,
  `_PATIENT_STREET2` varbinary(100) DEFAULT NULL,
  `_PATIENT_CITY` varbinary(100) DEFAULT NULL,
  `PATIENT_STATE` varchar(12) DEFAULT NULL,
  `_PATIENT_PROVINCE` varbinary(100) DEFAULT NULL,
  `_PATIENT_POSTAL_CODE` varbinary(50) DEFAULT NULL,
  `PATIENT_COUNTRY` char(4) DEFAULT NULL,
  `PATIENT_PHONE_COUNTRY` char(4) NOT NULL DEFAULT '1',
  `_PATIENT_PHONE1` varbinary(50) DEFAULT NULL,
  `PATIENT_PHONE1_VERIFIED` tinyint unsigned NOT NULL DEFAULT '0',
  `_PATIENT_PHONE2` varbinary(50) DEFAULT NULL,
  `_PATIENT_PHONE3` varbinary(50) DEFAULT NULL,
  `_PATIENT_EMAIL` varbinary(200) DEFAULT NULL,
  `PATIENT_EMAIL_VERIFIED` tinyint unsigned NOT NULL DEFAULT '0',
  `PATIENT_PASSWORD` varchar(255) DEFAULT NULL,
  `PATIENT_GENDER` char(1) DEFAULT 'U' COMMENT 'Gender M = Male,  F = Female, U=Unknown',
  `PATIENT_GENDENTITY` char(1) DEFAULT 'U' COMMENT 'Gender Identity  M = Male,  F = Female,  X = Non-Binary, U=Unknown',
  `PATIENT_DOB` date DEFAULT '1900-01-01' COMMENT 'Patient Date of Birth',
  `PATIENT_RACE` varchar(50) DEFAULT NULL,
  `PATIENT_ETHNICITY` varchar(50) DEFAULT NULL,
  `_PATIENT_SSN` varbinary(50) DEFAULT '000000000' COMMENT 'Patient SSN',
  `PATIENT_ID_ALT` varchar(100) DEFAULT NULL,
  `PATIENT_AUTOLOGIN` varchar(255) DEFAULT NULL,
  `PATIENT_ADT_TRANSMITTED` datetime DEFAULT NULL,
  PRIMARY KEY (`PATIENT_ID`),
  UNIQUE KEY `LK_ID_ALT` (`PATIENT_ID_ALT`),
  KEY `LK_FNAME` (`_PATIENT_FNAME`),
  KEY `LK_LNAME` (`_PATIENT_LNAME`),
  KEY `LK_SSN_PHONE1` (`_PATIENT_SSN`,`_PATIENT_PHONE1`),
  KEY `LK_PHONE1_VER` (`PATIENT_PHONE1_VERIFIED`),
  KEY `LK_EMAIL_VER` (`PATIENT_EMAIL_VERIFIED`),
  KEY `LK_FAMILY` (`PATIENT_FAMILY_KEY`),
  KEY `LK_DOB` (`PATIENT_DOB`),
  KEY `LK_PATIENT_ADT` (`PATIENT_ADT_TRANSMITTED`)
) ENGINE=InnoDB AUTO_INCREMENT=69266 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_ATTRIBUTES`
--

DROP TABLE IF EXISTS `PATIENTS_ATTRIBUTES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_ATTRIBUTES` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `ATTR_KEY` varchar(50) NOT NULL DEFAULT '',
  `PA_CREATED` datetime DEFAULT NULL,
  `ATTR_VALUE` mediumtext,
  `ATTR_SECURE` blob,
  `ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `VISIBLE` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`PATIENT_ID`,`ATTR_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_DIAGNOSES`
--

DROP TABLE IF EXISTS `PATIENTS_DIAGNOSES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_DIAGNOSES` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `ICD_CODE` varchar(50) NOT NULL DEFAULT '',
  `PI_CREATED` datetime DEFAULT NULL,
  `PI_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PATIENT_ID`,`ICD_CODE`),
  KEY `LK_CREATED` (`PI_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_DOCUMENTS`
--

DROP TABLE IF EXISTS `PATIENTS_DOCUMENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_DOCUMENTS` (
  `DOC_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `PD_CREATED` datetime DEFAULT NULL,
  `PD_NAME` varchar(50) DEFAULT NULL,
  `PD_DESCRIPTION` varchar(50) DEFAULT NULL,
  `PD_ORIGINAL_NAME` varchar(100) DEFAULT NULL,
  `PD_MIME` varchar(50) DEFAULT NULL,
  `PD_PATH` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`DOC_ID`),
  KEY `FK_PATIENT` (`PATIENT_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_MEDNEC`
--

DROP TABLE IF EXISTS `PATIENTS_MEDNEC`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_MEDNEC` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `MEDNEC_CODE` varchar(20) NOT NULL DEFAULT '',
  `PM_CREATED` datetime DEFAULT NULL,
  `PM_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PATIENT_ID`,`MEDNEC_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_MEDS`
--

DROP TABLE IF EXISTS `PATIENTS_MEDS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_MEDS` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `MED_NAME` varchar(50) NOT NULL DEFAULT '',
  `PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `PHARMACY_NPI` varchar(10) DEFAULT NULL,
  `RX_NUMBER` varchar(50) DEFAULT NULL,
  `RX_FILLED` date DEFAULT NULL,
  `RX_REFILLS` int unsigned NOT NULL DEFAULT '0',
  `DRUG_CLASS` varchar(50) DEFAULT NULL,
  `NCD_ID` varchar(50) NOT NULL DEFAULT '',
  `MEDISPAN_ID` varchar(50) NOT NULL DEFAULT '',
  `STRENGTH` varchar(50) DEFAULT NULL,
  `FORMAT` varchar(50) DEFAULT 'UNSPECIFIED',
  `DOSE_COUNT` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'PILLS PER DOSE',
  `MAX_DAILY` tinyint unsigned NOT NULL DEFAULT '1',
  `QUANTITY` int unsigned DEFAULT '0',
  `FREQUENCY` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'TIMES PER DAY',
  `TIME_OF_DAY` varchar(50) DEFAULT NULL,
  `WITH_FOOD` tinyint unsigned NOT NULL DEFAULT '0',
  `AVOID_ALCOHOL` tinyint unsigned NOT NULL DEFAULT '0',
  `IMPAIRMENT` tinyint unsigned NOT NULL DEFAULT '0',
  `LAST_DOSE` datetime DEFAULT NULL,
  PRIMARY KEY (`PATIENT_ID`,`MED_NAME`),
  KEY `FK_DRUG_CLASS` (`DRUG_CLASS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_MEDS_ALERTS`
--

DROP TABLE IF EXISTS `PATIENTS_MEDS_ALERTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_MEDS_ALERTS` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `TIME_OF_DAY` varchar(50) NOT NULL,
  `LAST_TYPE` varchar(50) DEFAULT NULL,
  `LAST_PATIENT_EMAIL` datetime DEFAULT NULL,
  `LAST_PATIENT_SMS` datetime DEFAULT NULL,
  `LAST_SMS_SID` varchar(50) DEFAULT NULL,
  `LAST_MTR_EMAIL` datetime DEFAULT NULL,
  `LAST_MTR_SMS` datetime DEFAULT NULL,
  `LAST_AGENT` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`PATIENT_ID`,`TIME_OF_DAY`),
  KEY `LK_TYPE` (`LAST_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_MEDS_LOG`
--

DROP TABLE IF EXISTS `PATIENTS_MEDS_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_MEDS_LOG` (
  `PML_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `MED_NAME` varchar(50) DEFAULT NULL,
  `EVENT_KEY` varchar(10) DEFAULT NULL COMMENT 'YYYYMMDDH*',
  `EVENT_DATE` datetime DEFAULT NULL,
  `ERROR_COUNT` int unsigned NOT NULL DEFAULT '0',
  `DUPE_COUNT` int unsigned NOT NULL DEFAULT '0',
  `STATUS` varchar(50) DEFAULT NULL,
  `RAW_SCAN` mediumtext,
  `SMS_ALERT_SENT` datetime DEFAULT NULL,
  `SMS_ALERT_PHONE` varchar(50) DEFAULT NULL,
  `SMS_ALERT_RESPONSE` varchar(255) DEFAULT NULL,
  `EMAIL_ALERT_SENT` datetime DEFAULT NULL,
  `EMAIL_ADDRESS` varchar(100) DEFAULT NULL,
  `PML_SOURCE` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`PML_ID`),
  UNIQUE KEY `NODUPE` (`PATIENT_ID`,`MED_NAME`,`EVENT_KEY`),
  KEY `FK_PID` (`PATIENT_ID`),
  KEY `LK_STATUS` (`STATUS`),
  KEY `LK_SENT_SMS` (`SMS_ALERT_SENT`),
  KEY `LK_SENT_EMAIL` (`EMAIL_ALERT_SENT`)
) ENGINE=InnoDB AUTO_INCREMENT=177424 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_MEDS_LOG_copy`
--

DROP TABLE IF EXISTS `PATIENTS_MEDS_LOG_copy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_MEDS_LOG_copy` (
  `PML_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `MED_NAME` varchar(50) DEFAULT NULL,
  `EVENT_KEY` varchar(10) DEFAULT NULL COMMENT 'YYYYMMDDH*',
  `EVENT_DATE` datetime DEFAULT NULL,
  `STATUS` varchar(50) DEFAULT NULL,
  `SMS_ALERT_SENT` datetime DEFAULT NULL,
  `SMS_ALERT_PHONE` varchar(50) DEFAULT NULL,
  `SMS_ALERT_RESPONS` varchar(255) DEFAULT NULL,
  `EMAIL_ALERT_SENT` datetime DEFAULT NULL,
  `EMAIL_ADDRESS` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`PML_ID`),
  KEY `FK_PID` (`PATIENT_ID`),
  KEY `LK_STATUS` (`STATUS`),
  KEY `LK_SENT_SMS` (`SMS_ALERT_SENT`),
  KEY `LK_SENT_EMAIL` (`EMAIL_ALERT_SENT`)
) ENGINE=InnoDB AUTO_INCREMENT=450 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_PARENTS`
--

DROP TABLE IF EXISTS `PATIENTS_PARENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_PARENTS` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `PARENT_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PATIENT_ID`,`PARENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_PAYERS`
--

DROP TABLE IF EXISTS `PATIENTS_PAYERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_PAYERS` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE` varchar(20) NOT NULL DEFAULT '',
  `PAYER_CARDINALITY` tinyint unsigned NOT NULL DEFAULT '1',
  `_PAYER_SUB_IDNUMBER` varbinary(100) DEFAULT NULL,
  `_PAYER_SUB_GROUP` varbinary(100) DEFAULT NULL,
  `_PAYER_SUB_RXGROUP` varbinary(100) DEFAULT NULL COMMENT 'Pharmacy Group Number',
  `_PAYER_SUB_RXBIN` varbinary(100) DEFAULT NULL COMMENT 'Pharmacy Bank ID Number',
  `_PAYER_SUB_RXPCN` varbinary(100) DEFAULT NULL COMMENT 'Pharmacy Processor Control Number',
  `_PAYER_SUB_FNAME` varbinary(100) DEFAULT NULL,
  `_PAYER_SUB_LNAME` varbinary(100) DEFAULT NULL,
  `PAYER_SUB_RELATIONSHIP` tinyint unsigned NOT NULL DEFAULT '1' COMMENT '1 = SELF,  2 = SPOUSE, 3 = CHILD, 4 = OTHER',
  `PAYER_SUB_GUARANTOR` tinyint unsigned NOT NULL DEFAULT '0',
  `_PAYER_SUB_STREET1` varbinary(100) DEFAULT NULL,
  `_PAYER_SUB_STREET2` varbinary(100) DEFAULT NULL,
  `_PAYER_SUB_CITY` varbinary(100) DEFAULT NULL,
  `PAYER_SUB_STATE` varchar(12) DEFAULT NULL,
  `_PAYER_SUB_PROVINCE` varbinary(100) DEFAULT NULL,
  `_PAYER_SUB_POSTAL_CODE` varbinary(50) DEFAULT NULL,
  `PAYER_SUB_COUNTRY` char(4) DEFAULT NULL,
  `PAYER_EFF_DATE` date DEFAULT NULL,
  `_PAYER_AUTH` varbinary(100) DEFAULT NULL,
  PRIMARY KEY (`PATIENT_ID`,`PAYER_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_POSITIVES`
--

DROP TABLE IF EXISTS `PATIENTS_POSITIVES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_POSITIVES` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `DRUG_CLASS` varchar(50) NOT NULL DEFAULT '',
  `PD_DATE` datetime DEFAULT '2014-01-01 00:00:00',
  PRIMARY KEY (`PATIENT_ID`,`DRUG_CLASS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_PRACTITIONERS`
--

DROP TABLE IF EXISTS `PATIENTS_PRACTITIONERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_PRACTITIONERS` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `PRACTITIONER_NPI` varchar(10) NOT NULL,
  `PP_PRIMARY` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PATIENT_ID`,`PRACTITIONER_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PATIENTS_TARGETS`
--

DROP TABLE IF EXISTS `PATIENTS_TARGETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PATIENTS_TARGETS` (
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `TARGET_NAME` varchar(50) NOT NULL DEFAULT 'drug',
  PRIMARY KEY (`PATIENT_ID`,`TARGET_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PAYERS`
--

DROP TABLE IF EXISTS `PAYERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PAYERS` (
  `PAYER_CODE` varchar(20) NOT NULL DEFAULT '',
  `PAYER_NAME` varchar(50) DEFAULT NULL,
  `PAYER_KEYWORDS` varchar(255) DEFAULT NULL,
  `PAYER_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `PAYER_CLASS` varchar(50) DEFAULT 'CMS' COMMENT 'FK CLASSES',
  `PAYER_STREET1` varchar(50) DEFAULT NULL,
  `PAYER_STREET2` varchar(50) DEFAULT NULL,
  `PAYER_CITY` varchar(50) DEFAULT NULL,
  `PAYER_STATE` char(2) DEFAULT NULL,
  `PAYER_ZIPCODE` varchar(5) DEFAULT NULL,
  `PAYER_PHONE` varchar(20) DEFAULT NULL,
  `PAYER_PRIOR_AUTH_REQ` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Prior Authorization Required Flag',
  `PAYER_SELF_ONLY` tinyint unsigned NOT NULL DEFAULT '0',
  `BILLER_PAYER_CODE` varchar(20) DEFAULT NULL,
  `PAYER_SOURCE` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`PAYER_CODE`),
  KEY `LK_KEYS` (`PAYER_KEYWORDS`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PAYERS_CROSSWALK`
--

DROP TABLE IF EXISTS `PAYERS_CROSSWALK`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PAYERS_CROSSWALK` (
  `PAYER_NAME` varchar(255) NOT NULL,
  `PAYER_CODE` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`PAYER_NAME`),
  KEY `PAYER_CODE` (`PAYER_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PAYERS_VALIDATIONS`
--

DROP TABLE IF EXISTS `PAYERS_VALIDATIONS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PAYERS_VALIDATIONS` (
  `PAYER_CODE` varchar(10) NOT NULL DEFAULT '',
  `VALIDATION_PATTERN` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`PAYER_CODE`,`VALIDATION_PATTERN`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PENDING_ORDERS`
--

DROP TABLE IF EXISTS `PENDING_ORDERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PENDING_ORDERS` (
  `PENDING_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0',
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '',
  `SPECIMEN_REFERENCE` varchar(50) DEFAULT NULL COMMENT 'ordering facility reference code',
  `SPECIMEN_TYPE` varchar(20) DEFAULT 'URINE',
  `SPECIMEN_COLLECTED` datetime DEFAULT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `ANIMAL_ID` int unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE_1` varchar(20) DEFAULT NULL,
  `PAYER_CODE_2` varchar(20) DEFAULT NULL,
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL,
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `ORDER_REF_LAB_NPI` varchar(50) DEFAULT NULL,
  `ORDER_CREATED_ORIGIN` varchar(50) DEFAULT NULL,
  `ORDER_CREATED` datetime DEFAULT NULL,
  `ORDER_CREATED_USER_ID` int unsigned DEFAULT '0',
  `ORDER_CREATED_COMMENT` mediumtext,
  `ORDER_CREATED_CHARGE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `ORDER_CREATED_DA` varchar(200) DEFAULT NULL,
  `ORDER_CREATED_RX_LIST` mediumtext,
  `ORDER_CREATED_DX_CODES` mediumtext,
  `ORDER_CREATED_MEDICAL_NECESSITY` mediumtext,
  `ORDER_CREATED_LAT` varchar(50) DEFAULT '0.00000000',
  `ORDER_CREATED_LNG` varchar(50) DEFAULT '0.00000000',
  `SERVICE_LIST` mediumtext,
  `ORDER_HOLD_CLAIM` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_DIRECT_BILL_LOCK` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_PRINTED` tinyint unsigned DEFAULT '0',
  `ORDER_CREATED_RAW` longtext,
  `ORDER_API_DATA` varchar(255) DEFAULT NULL,
  `ORDER_API_LOG` mediumtext,
  `ORDER_API_COMPLETE` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PENDING_ID`),
  UNIQUE KEY `LK_ONEPERPATIENT` (`PATIENT_ID`,`SPECIMEN_COLLECTED`,`SERVICE_LIST`(100)),
  KEY `FK_ORDERS` (`ORDER_ID`),
  KEY `LK_API_DATA` (`ORDER_API_DATA`),
  KEY `LK_API_COMPLETE` (`ORDER_API_COMPLETE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PENDING_ORDERS_CANCELLED`
--

DROP TABLE IF EXISTS `PENDING_ORDERS_CANCELLED`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PENDING_ORDERS_CANCELLED` (
  `PENDING_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `ORDER_ID` int unsigned NOT NULL DEFAULT '0',
  `PACKAGE_NAME` varchar(50) DEFAULT NULL,
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '',
  `SPECIMEN_REFERENCE` varchar(50) DEFAULT NULL COMMENT 'ordering facility reference code',
  `SPECIMEN_TYPE` varchar(20) DEFAULT 'URINE',
  `SPECIMEN_COLLECTED` datetime DEFAULT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `ANIMAL_ID` int unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE_1` varchar(20) DEFAULT NULL,
  `PAYER_CODE_2` varchar(20) DEFAULT NULL,
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL,
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `ORDER_REF_LAB_NPI` varchar(50) DEFAULT NULL,
  `ORDER_CREATED_ORIGIN` varchar(50) DEFAULT NULL,
  `ORDER_CREATED` datetime DEFAULT NULL,
  `ORDER_CREATED_USER_ID` int unsigned DEFAULT '0',
  `ORDER_CREATED_COMMENT` mediumtext,
  `ORDER_CREATED_CHARGE` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PAYMENT` decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
  `ORDER_CREATED_PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `ORDER_CREATED_DA` varchar(200) DEFAULT NULL,
  `ORDER_CREATED_RX_LIST` mediumtext,
  `ORDER_CREATED_DX_CODES` mediumtext,
  `ORDER_CREATED_MEDICAL_NECESSITY` mediumtext,
  `ORDER_CREATED_LAT` varchar(50) DEFAULT '0.00000000',
  `ORDER_CREATED_LNG` varchar(50) DEFAULT '0.00000000',
  `SERVICE_LIST` mediumtext,
  `ORDER_HOLD_CLAIM` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_DIRECT_BILL_LOCK` tinyint unsigned NOT NULL DEFAULT '0',
  `ORDER_PRINTED` tinyint unsigned DEFAULT '0',
  `ORDER_CREATED_RAW` longtext,
  `ORDER_API_DATA` varchar(255) DEFAULT NULL,
  `ORDER_API_LOG` mediumtext,
  `ORDER_API_COMPLETE` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PENDING_ID`),
  UNIQUE KEY `FK_PACKAGE_SPECIMEN` (`SPECIMEN_CODE`,`PACKAGE_NAME`),
  KEY `FK_ORDERS` (`ORDER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PENDING_PATIENTS`
--

DROP TABLE IF EXISTS `PENDING_PATIENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PENDING_PATIENTS` (
  `PATIENT_CREATED` varchar(22) DEFAULT NULL,
  `PATIENT_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PATIENT_UPDATED` varchar(22) DEFAULT NULL,
  `PATIENT_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PATIENT_FNAME` varchar(50) NOT NULL DEFAULT '',
  `PATIENT_MNAME` varchar(50) DEFAULT NULL,
  `PATIENT_LNAME` varchar(50) NOT NULL DEFAULT '',
  `PATIENT_SUFFIX` varchar(20) DEFAULT NULL,
  `PATIENT_STREET1` varchar(50) DEFAULT NULL,
  `PATIENT_STREET2` varchar(50) DEFAULT NULL,
  `PATIENT_CITY` varchar(50) DEFAULT NULL,
  `PATIENT_STATE` varchar(12) DEFAULT NULL,
  `PATIENT_PROVINCE` varchar(50) DEFAULT NULL,
  `PATIENT_POSTAL_CODE` varchar(20) DEFAULT NULL,
  `PATIENT_COUNTRY` char(4) DEFAULT NULL,
  `PATIENT_PHONE1` varchar(20) DEFAULT NULL,
  `PATIENT_PHONE2` varchar(20) DEFAULT NULL,
  `PATIENT_PHONE3` varchar(20) DEFAULT NULL,
  `PATIENT_EMAIL` varchar(100) DEFAULT NULL,
  `PATIENT_GENDER` char(1) NOT NULL DEFAULT 'X',
  `PATIENT_GENDENTITY` char(1) DEFAULT 'X',
  `PATIENT_DOB` varchar(20) NOT NULL DEFAULT '',
  `PATIENT_RACE` varchar(50) DEFAULT NULL,
  `PATIENT_ETHNICITY` varchar(50) DEFAULT NULL,
  `PATIENT_SSN` varchar(20) DEFAULT NULL,
  `PATIENT_DX_LIST` varchar(255) DEFAULT NULL,
  `PATIENT_RX_LIST` varchar(255) DEFAULT NULL,
  `AP_MRN` varchar(50) DEFAULT NULL,
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `GROUP_CODE` varchar(50) DEFAULT NULL,
  `PAYER_CODE_1` varchar(50) DEFAULT NULL,
  `PAYER_SUB_IDNUMBER_1` varchar(50) DEFAULT NULL,
  `PAYER_SUB_GROUP_1` varchar(50) DEFAULT NULL,
  `PAYER_SUB_FNAME_1` varchar(50) DEFAULT NULL,
  `PAYER_SUB_LNAME_1` varchar(50) DEFAULT NULL,
  `PAYER_SUB_REL_1` tinyint unsigned NOT NULL DEFAULT '0',
  `PAYER_CODE_2` varchar(50) DEFAULT NULL,
  `PAYER_SUB_IDNUMBER_2` varchar(50) DEFAULT NULL,
  `PAYER_SUB_GROUP_2` varchar(50) DEFAULT NULL,
  `PAYER_SUB_FNAME_2` varchar(50) DEFAULT NULL,
  `PAYER_SUB_LNAME_2` varchar(50) DEFAULT NULL,
  `PAYER_SUB_REL_2` tinyint unsigned NOT NULL DEFAULT '0',
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PATIENT_LNAME`,`PATIENT_FNAME`,`PATIENT_DOB`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PENDING_USERS`
--

DROP TABLE IF EXISTS `PENDING_USERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PENDING_USERS` (
  `USER_PHONE` varchar(20) NOT NULL DEFAULT '',
  `USER_EMAIL` varchar(100) NOT NULL DEFAULT '',
  `USER_PHONE_COUNTRY_CODE` char(4) NOT NULL DEFAULT '1',
  `PU_CREATED` datetime DEFAULT NULL,
  `PU_UPDATED` datetime DEFAULT NULL,
  `PU_FNAME` varchar(50) DEFAULT NULL,
  `PU_LNAME` varchar(50) DEFAULT NULL,
  `PU_TEMPCODE` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`USER_PHONE`,`USER_EMAIL`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRACTITIONERS`
--

DROP TABLE IF EXISTS `PRACTITIONERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRACTITIONERS` (
  `PRACTITIONER_NPI` varchar(10) NOT NULL DEFAULT '',
  `PRACTITIONER_FNAME` varchar(50) DEFAULT NULL,
  `PRACTITIONER_MNAME` varchar(50) DEFAULT NULL,
  `PRACTITIONER_LNAME` varchar(50) DEFAULT NULL,
  `PRACTITIONER_CREDENTIALS` varchar(20) DEFAULT NULL,
  `PRACTITIONER_STREET1` varchar(50) DEFAULT NULL,
  `PRACTITIONER_STREET2` varchar(50) DEFAULT NULL,
  `PRACTITIONER_CITY` varchar(20) DEFAULT NULL,
  `PRACTITIONER_STATE` char(2) DEFAULT NULL,
  `PRACTITIONER_PROVINCE` varchar(50) DEFAULT NULL,
  `PRACTITIONER_POSTAL_CODE` varchar(10) DEFAULT NULL,
  `PRACTITIONER_COUNTRY` char(4) DEFAULT NULL,
  `PRACTITIONER_DETAILS` mediumtext,
  `PRACTITIONER_PHONE` varchar(20) DEFAULT NULL,
  `PRACTITIONER_FAX` varchar(20) DEFAULT NULL,
  `PRACTITIONER_EMAIL` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`PRACTITIONER_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRACTITIONERS_AVAILABILITY`
--

DROP TABLE IF EXISTS `PRACTITIONERS_AVAILABILITY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRACTITIONERS_AVAILABILITY` (
  `PRACTITIONER_NPI` varchar(10) NOT NULL DEFAULT '',
  `AGENCY_CODE` varchar(50) NOT NULL DEFAULT '',
  `PA_START_TIME` time NOT NULL DEFAULT '00:00:00',
  `PA_END_TIME` time NOT NULL DEFAULT '00:00:00',
  `PA_SUN` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_MON` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_TUE` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_WED` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_THU` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_FRI` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_SAT` tinyint unsigned NOT NULL DEFAULT '0',
  `PA_CREATED` datetime DEFAULT NULL,
  `PA_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PRACTITIONER_NPI`,`AGENCY_CODE`,`PA_START_TIME`,`PA_END_TIME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRACTITIONERS_PACKAGES`
--

DROP TABLE IF EXISTS `PRACTITIONERS_PACKAGES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRACTITIONERS_PACKAGES` (
  `PRACTITIONER_NPI` varchar(10) NOT NULL DEFAULT '',
  `PACKAGE_NAME` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`PRACTITIONER_NPI`,`PACKAGE_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRACTITIONERS_USERS`
--

DROP TABLE IF EXISTS `PRACTITIONERS_USERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRACTITIONERS_USERS` (
  `PRACTITIONER_NPI` varchar(10) NOT NULL DEFAULT '',
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PU_CREATED` datetime DEFAULT NULL,
  `PU_GRANTED` datetime DEFAULT NULL,
  `PU_GRANTED_FILENAME` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`PRACTITIONER_NPI`,`USER_ID`),
  KEY `LK_FILENAME` (`PU_GRANTED_FILENAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRINT_JOBS`
--

DROP TABLE IF EXISTS `PRINT_JOBS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRINT_JOBS` (
  `PJ_ID` int NOT NULL AUTO_INCREMENT,
  `PJ_CREATED` datetime DEFAULT NULL,
  `PRINTER_ID` varchar(50) DEFAULT 'TEST',
  `PJ_PAYLOAD` mediumtext COMMENT 'BARCODE^LABEL',
  `PJ_COMPLETED` datetime DEFAULT NULL,
  `PJ_CANCELLED` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`PJ_ID`),
  KEY `LK_PRINTER` (`PRINTER_ID`),
  KEY `LK_COMPLETED` (`PJ_COMPLETED`),
  KEY `LC_CANCELLED` (`PJ_CANCELLED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PROMOTIONS`
--

DROP TABLE IF EXISTS `PROMOTIONS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PROMOTIONS` (
  `PROMO_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `PROMO_CREATED` datetime DEFAULT NULL,
  `PROMO_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `PROMO_NAME` varchar(255) DEFAULT NULL,
  `PROMO_INFO` mediumtext,
  `PROMO_GIFT_PATH` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`PROMO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RACE`
--

DROP TABLE IF EXISTS `RACE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RACE` (
  `RACE_CODE` varchar(20) NOT NULL,
  `HIERARCHICAL_CODE` varchar(20) DEFAULT NULL,
  `CONCEPT` varchar(50) DEFAULT NULL,
  `SYNONYM` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`RACE_CODE`),
  KEY `LK_CONCEPT` (`CONCEPT`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `REFERENCE_LABS`
--

DROP TABLE IF EXISTS `REFERENCE_LABS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `REFERENCE_LABS` (
  `LAB_NPI` varchar(10) NOT NULL DEFAULT '',
  `LAB_CLIA_ID` varchar(10) DEFAULT NULL,
  `LAB_COLA_ID` varchar(10) DEFAULT NULL,
  `LAB_PFI` varchar(20) DEFAULT NULL,
  `LAB_TAX_ID` varchar(50) DEFAULT NULL,
  `LAB_FLEET_ID` char(3) NOT NULL DEFAULT '000',
  `LAB_ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `LAB_CREATED` datetime DEFAULT NULL,
  `LAB_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `LAB_UPDATED` datetime DEFAULT NULL,
  `LAB_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `LAB_SUBDOMAIN` varchar(50) DEFAULT NULL,
  `LAB_TYPE` char(4) DEFAULT 'POL' COMMENT 'POL, REF',
  `LAB_NAME` varchar(50) DEFAULT NULL,
  `LAB_BRANDNAME` varchar(50) DEFAULT NULL,
  `LAB_TAGLINE` varchar(255) DEFAULT NULL,
  `LAB_COLORS` varchar(255) DEFAULT '633dae,007fe2,00aa00',
  `LAB_STREET1` varchar(50) DEFAULT NULL,
  `LAB_STREET2` varchar(50) DEFAULT NULL,
  `LAB_CITY` varchar(50) DEFAULT NULL,
  `LAB_STATE` char(2) DEFAULT NULL,
  `LAB_COUNTY` varchar(50) DEFAULT NULL,
  `LAB_TAX_RATE` decimal(10,4) unsigned DEFAULT NULL,
  `LAB_PROVINCE` varchar(50) DEFAULT NULL,
  `LAB_POSTAL` varchar(10) DEFAULT NULL,
  `LAB_COUNTRY` varchar(20) DEFAULT NULL,
  `LAB_TIMEZONE` varchar(20) DEFAULT NULL,
  `LAB_GEO_LAT` decimal(10,6) DEFAULT NULL,
  `LAB_GEO_LNG` decimal(10,6) DEFAULT NULL,
  `LAB_PHONE` varchar(20) DEFAULT NULL,
  `LAB_FAX` varchar(20) DEFAULT NULL,
  `LAB_WEBSITE` varchar(100) DEFAULT 'https://EHRspeed.com',
  `LAB_LCMS_QC` varchar(255) DEFAULT 'QC2,QC3,QC5',
  `LAB_TAXONOMY` varchar(100) DEFAULT NULL,
  `LAB_DIRECTOR` varchar(100) DEFAULT NULL,
  `LAB_DIRECTOR_NPI` varchar(10) DEFAULT '0000000000',
  `LAB_DIRECTOR_CQ` varchar(50) DEFAULT NULL,
  `LAB_CONTACT` varchar(50) DEFAULT NULL,
  `LAB_CONTACT_PHONE` varchar(20) DEFAULT NULL,
  `LAB_CONTACT_EMAIL` varchar(100) DEFAULT NULL,
  `LAB_RESTRICTED_IPS` varchar(255) DEFAULT NULL,
  `LAB_REPORT_NOTE` mediumtext,
  `LAB_INSTRUMENT_COMM` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '0=None, 1=Viva E',
  `LAB_TOXIBOT_JOB_TYPE` int unsigned NOT NULL DEFAULT '0',
  `LAB_ECHO_SYSTEM` varchar(50) DEFAULT NULL,
  `LAB_ECHO_SFTP_ADDRESS` varchar(100) DEFAULT NULL,
  `LAB_ECHO_SFTP_PORT` int unsigned NOT NULL DEFAULT '22',
  `LAB_ECHO_SFTP_USER` varchar(50) DEFAULT NULL,
  `_LAB_ECHO_SFTP_PASSWORD` varbinary(255) DEFAULT NULL,
  `LAB_ECHO_SFTP_ORDERS` varchar(255) DEFAULT NULL,
  `LAB_ECHO_SFTP_RESULTS` varchar(255) DEFAULT NULL,
  `LAB_BILLING_SYSTEM` varchar(50) DEFAULT NULL,
  `LAB_BILLING_SFTP_ADDRESS` varchar(100) DEFAULT NULL,
  `LAB_BILLING_SFTP_PORT` int unsigned NOT NULL DEFAULT '22',
  `LAB_BILLING_SFTP_USER` varchar(50) DEFAULT NULL,
  `_LAB_BILLING_SFTP_PASSWORD` varbinary(255) DEFAULT NULL,
  `LAB_BILLING_SFTP_CLAIMS` varchar(255) DEFAULT NULL,
  `LAB_BILLING_SFTP_RESPONSES` varchar(255) DEFAULT NULL,
  `LAB_API_PATH` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`LAB_NPI`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RESULT_CODES`
--

DROP TABLE IF EXISTS `RESULT_CODES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESULT_CODES` (
  `RESULT_CODE` varchar(20) NOT NULL DEFAULT '',
  `RESULT_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `SNOMED_SCT` varchar(20) DEFAULT NULL,
  `SNOMED_WORD` varchar(50) DEFAULT NULL,
  `RESULT_COLOR` varchar(6) DEFAULT '808080' COMMENT 'HEX COLOR CODE',
  `RESULT_SORT` decimal(10,4) unsigned NOT NULL DEFAULT '99.0000',
  `RESULT_PRE` tinyint unsigned NOT NULL DEFAULT '1',
  `RESULT_DEF` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`RESULT_CODE`),
  KEY `LK_PRE` (`RESULT_PRE`),
  KEY `LK_DEF` (`RESULT_DEF`),
  KEY `LK_SORT` (`RESULT_SORT`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RTM_PATIENTS_PERIODS`
--

DROP TABLE IF EXISTS `RTM_PATIENTS_PERIODS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RTM_PATIENTS_PERIODS` (
  `PATIENT_ID` int NOT NULL DEFAULT '0',
  `PERIOD_ID` int NOT NULL DEFAULT '0',
  `PP_START` date NOT NULL,
  `PP_END` date NOT NULL,
  PRIMARY KEY (`PATIENT_ID`,`PERIOD_ID`),
  KEY `LK_START` (`PP_START`),
  KEY `LK_END` (`PP_END`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SENSESSION`
--

DROP TABLE IF EXISTS `SENSESSION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SENSESSION` (
  `SESSION_ID` int NOT NULL AUTO_INCREMENT,
  `SESSION_KEY` varchar(50) DEFAULT NULL COMMENT 'IPV4 + YYMMDDHH',
  `SESSION_CREATED` datetime DEFAULT NULL,
  `SESSION_IPV4` varchar(15) DEFAULT '0.0.0.0',
  `SESSION_HOST` varchar(255) DEFAULT NULL,
  `SESSION_REFERER` varchar(255) DEFAULT NULL,
  `SESSION_AGENT` varchar(255) DEFAULT NULL,
  `SESSION_SCROLL` int unsigned NOT NULL DEFAULT '0',
  `SESSION_CLICKS` mediumtext,
  `SESSION_GEO_CERTAINTY` int unsigned NOT NULL DEFAULT '0',
  `SESSION_GEO_LAT` varchar(20) DEFAULT NULL,
  `SESSION_GEO_LNG` varchar(20) DEFAULT NULL,
  `SESSION_GEO_FQCN` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`SESSION_ID`),
  UNIQUE KEY `NODUPE` (`SESSION_KEY`)
) ENGINE=InnoDB AUTO_INCREMENT=13416 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SPECIMENS`
--

DROP TABLE IF EXISTS `SPECIMENS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SPECIMENS` (
  `SPECIMEN_CODE` varchar(50) NOT NULL DEFAULT '',
  `PATIENT_ENCOUNTER` date DEFAULT NULL,
  `SPECIMEN_ACTIVE` tinyint unsigned DEFAULT '1',
  `SPECIMEN_TYPE` varchar(10) DEFAULT 'URINE' COMMENT 'URINE,SALIVA,BLOOD,SERUM',
  `SPECIMEN_STATUS` varchar(20) NOT NULL DEFAULT 'UNCOLLECTED',
  `SPECIMEN_LABEL` varchar(50) DEFAULT NULL,
  `SPECIMEN_REFERENCE` varchar(50) DEFAULT NULL COMMENT 'ordering facility reference code',
  `SPECIMEN_CREATED` datetime DEFAULT NULL,
  `SPECIMEN_CREATED_USER_ID` int unsigned DEFAULT '0',
  `SPECIMEN_UPDATED` datetime DEFAULT NULL,
  `SPECIMEN_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `SPECIMEN_COLLECTED` datetime DEFAULT NULL,
  `SPECIMEN_SHIPPED` datetime DEFAULT NULL,
  `SPECIMEN_SHIPPED_USER_ID` int unsigned DEFAULT '0',
  `SPECIMEN_RECEIVED` datetime DEFAULT '1900-01-01 00:00:00',
  `SPECIMEN_RECEIVED_USER_ID` int unsigned DEFAULT '0',
  `SPECIMEN_RECEIVED_PAYMENT` decimal(10,2) DEFAULT '0.00' COMMENT 'Amount of Money Received',
  `SPECIMEN_RECEIVED_PAYMENT_TYPE` varchar(20) DEFAULT NULL COMMENT 'cash, check, money-order, etc.',
  `SPECIMEN_RECEIVED_PAYMENT_REFERENCE` varchar(20) DEFAULT NULL COMMENT 'check or money-order number',
  `SPECIMEN_RECEIVED_COMMENT` mediumtext,
  `SPECIMEN_PROBLEM` tinyint unsigned NOT NULL DEFAULT '0',
  `SPECIMEN_PROBLEM_COMMENT` mediumtext COMMENT 'Details of Problem Encountered',
  `SPECIMEN_REASSIGNED` datetime DEFAULT NULL COMMENT 'Date and Time of Reassignment',
  `SPECIMEN_REASSIGNED_USER_ID` int unsigned NOT NULL DEFAULT '0' COMMENT 'User ID who performed reassignment',
  `SPECIMEN_REASSIGNED_ORIGINAL` varchar(50) DEFAULT NULL COMMENT 'Original Specimen Number PRIOR to reassignment',
  `SPECIMEN_DISCARDED` datetime DEFAULT NULL,
  `SPECIMEN_DISCARDED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `SPECIMEN_IMAGE_FILENAME` varchar(100) DEFAULT NULL COMMENT 'filename in media folder',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL,
  `PRACTITIONER_NPI` varchar(10) DEFAULT NULL,
  `PATIENT_ID` int unsigned DEFAULT '0',
  `ANIMAL_ID` int unsigned NOT NULL DEFAULT '0',
  `_PATIENT_FNAME` varbinary(100) DEFAULT '',
  `_PATIENT_MNAME` varbinary(100) DEFAULT NULL,
  `_PATIENT_LNAME` varbinary(100) DEFAULT NULL,
  `PATIENT_DOB` date DEFAULT NULL,
  `PATIENT_GENDER` char(2) DEFAULT NULL,
  `PATIENT_TYPE` varchar(50) DEFAULT 'HUMAN' COMMENT 'HUMAN,FELINE,CANINE,EQUINE',
  `AP_MRN` varchar(50) DEFAULT NULL,
  `AP_ACTIVE` tinyint unsigned NOT NULL DEFAULT '0',
  `AP_INTAKE_FILENAME` varchar(100) DEFAULT NULL,
  `SERVICE_LIST` mediumtext,
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `SPECIMEN_META_INVOICE` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`SPECIMEN_CODE`),
  KEY `LK_COLLECTED` (`SPECIMEN_COLLECTED`),
  KEY `FK_USERS_C` (`SPECIMEN_CREATED_USER_ID`),
  KEY `LK_SPECIMEN_TYPE` (`SPECIMEN_TYPE`),
  KEY `LK_STATUS` (`SPECIMEN_STATUS`),
  KEY `LK_SHIPPED_USER` (`SPECIMEN_SHIPPED_USER_ID`),
  KEY `LK_RECEIVED` (`SPECIMEN_RECEIVED`),
  KEY `FK_LAB_NPI` (`LAB_NPI`),
  KEY `FK_PATIENT_ENCOUNTER` (`PATIENT_ENCOUNTER`),
  KEY `FK_PATIENT` (`PATIENT_ID`),
  KEY `LK_IMAGE` (`SPECIMEN_IMAGE_FILENAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SPECIMENS_SERIALS`
--

DROP TABLE IF EXISTS `SPECIMENS_SERIALS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SPECIMENS_SERIALS` (
  `SPECIMEN_CODE` varchar(50) DEFAULT NULL,
  `SERIAL_NUMBER` bigint unsigned NOT NULL AUTO_INCREMENT,
  `CHECK_DIGIT` tinyint unsigned DEFAULT NULL,
  `SERIAL_CREATED` datetime DEFAULT NULL,
  `SERIAL_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`SERIAL_NUMBER`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SPECIMEN_TYPES`
--

DROP TABLE IF EXISTS `SPECIMEN_TYPES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SPECIMEN_TYPES` (
  `SPECIMEN_TYPE` varchar(50) NOT NULL DEFAULT '',
  `SPECIMEN_DESCRIPTION` varchar(255) DEFAULT NULL,
  `SNOMED_CODE` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`SPECIMEN_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SPECIMINT`
--

DROP TABLE IF EXISTS `SPECIMINT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SPECIMINT` (
  `LAB_FLEET_ID` char(3) NOT NULL DEFAULT '000',
  `SERIAL_NUMBER` int unsigned NOT NULL AUTO_INCREMENT,
  `SPECIMEN_CLASS` char(1) NOT NULL DEFAULT '0' COMMENT '0=Urine,1=Saliva,2=Oral Fluid,3=Serum,4=Plasma,5=WB,6=VTM/UTM,7,8,9 reserved',
  `CHECK_DIGIT` char(1) DEFAULT NULL,
  `SPECIMEN_CODE` varchar(11) DEFAULT NULL,
  `SPECIMEN_CREATED` datetime DEFAULT NULL,
  `SPECIMEN_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`SERIAL_NUMBER`),
  KEY `LK_SPECIMEN` (`SPECIMEN_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SQL_TODO`
--

DROP TABLE IF EXISTS `SQL_TODO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SQL_TODO` (
  `SQL_ID` int NOT NULL AUTO_INCREMENT,
  `SQL_CREATED` datetime DEFAULT NULL,
  `SQL_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `SQL_SCRIPT` varchar(255) DEFAULT NULL,
  `SQL_TRANSACTION` mediumtext,
  `SQL_AFFECTED` int unsigned NOT NULL DEFAULT '0',
  `SQL_COMPLETED` datetime DEFAULT NULL,
  PRIMARY KEY (`SQL_ID`),
  KEY `SQL_COMPLETED` (`SQL_COMPLETED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `STATES`
--

DROP TABLE IF EXISTS `STATES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `STATES` (
  `STATE_CODE` char(2) NOT NULL DEFAULT '',
  `STATE_NAME` varchar(50) DEFAULT NULL,
  `STATE_TIMEZONE` varchar(20) DEFAULT NULL,
  `STATE_COUNTIES` longtext,
  `STATE_LAF_CODE` varchar(10) DEFAULT NULL,
  `STATE_LAF_COUNTIES` longtext,
  PRIMARY KEY (`STATE_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `STATE_TZ`
--

DROP TABLE IF EXISTS `STATE_TZ`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `STATE_TZ` (
  `STATE` char(2) NOT NULL DEFAULT '',
  `TIMEZONE` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`STATE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `STICKIES`
--

DROP TABLE IF EXISTS `STICKIES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `STICKIES` (
  `STICKY_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `LAB_NPI` varchar(10) DEFAULT NULL,
  `AGENCY_CODE` varchar(50) DEFAULT NULL,
  `AGENCY_NPI` varchar(10) DEFAULT NULL,
  `STICKY_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `STICKY_CREATED` datetime DEFAULT NULL,
  `STICKY_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `STICKY_TITLE` varchar(100) DEFAULT NULL,
  `STICKY_NOTE` mediumtext,
  PRIMARY KEY (`STICKY_ID`),
  KEY `FK_LABS` (`LAB_NPI`),
  KEY `FK_AGENCIES` (`AGENCY_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TARGETS`
--

DROP TABLE IF EXISTS `TARGETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TARGETS` (
  `TARGET_NAME` varchar(50) NOT NULL DEFAULT '',
  `TARGET_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `TARGET_REPORT_NAME` varchar(100) DEFAULT NULL,
  `TARGET_COMMON_NAME` varchar(100) DEFAULT NULL,
  `TARGET_DESCRIPTION` longtext,
  `TARGET_IMAGE_FILENAME` varchar(255) DEFAULT NULL,
  `TARGET_SEARCH_TERMS` varchar(255) DEFAULT NULL,
  `DRUG_CLASS` varchar(50) DEFAULT NULL,
  `TARGET_EXAMPLES` mediumtext,
  `TARGET_TYPICAL_CUTOFF` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `TARGET_TYPICAL_RT` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `TARGET_TYPICAL_AREA` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `TARGET_TYPICAL_ULOQ` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `TARGET_UNITS` varchar(10) DEFAULT 'ng/mL',
  `TARGET_DET_DAYS` smallint unsigned NOT NULL DEFAULT '0',
  `TARGET_PARENT` varchar(50) DEFAULT NULL,
  `TARGET_METABOLITE` tinyint unsigned NOT NULL DEFAULT '0',
  `TARGET_DEA_ID` varchar(10) DEFAULT NULL,
  `TARGET_SCHEDULE` char(4) DEFAULT NULL,
  `TARGET_NARCOTIC` tinyint unsigned NOT NULL DEFAULT '0',
  `TARGET_ALLERGEN` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`TARGET_NAME`),
  KEY `LK_COMMON` (`TARGET_COMMON_NAME`),
  KEY `LK_ALLERGEN` (`TARGET_ALLERGEN`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIMEZONES`
--

DROP TABLE IF EXISTS `TIMEZONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIMEZONES` (
  `TIMEZONE_CODE` varchar(10) NOT NULL DEFAULT '',
  `TIMEZONE_NAME` varchar(50) DEFAULT NULL,
  `TIMEZONE_GMT_OFFSET` varchar(20) DEFAULT NULL,
  `TIMEZONE_OFFSET` decimal(10,2) NOT NULL DEFAULT '0.00',
  `TIMEZONE_ADJUSTED` decimal(10,2) NOT NULL DEFAULT '0.00',
  `TIMEZONE_DAYLIGHT` tinyint unsigned NOT NULL DEFAULT '0',
  `ZONE_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`TIMEZONE_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TLDS`
--

DROP TABLE IF EXISTS `TLDS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TLDS` (
  `TLD` varchar(20) NOT NULL DEFAULT '',
  `TLD_DESCRIPTION` varchar(255) DEFAULT NULL,
  `TLD_TYPE` varchar(10) DEFAULT NULL,
  `TLD_PUNYCODE` varchar(20) DEFAULT NULL,
  `TLD_LANGUAGE` varchar(10) DEFAULT NULL,
  `TLD_TRANSLATION` varchar(50) DEFAULT NULL,
  `TLD_ROMANIZED` varchar(50) DEFAULT NULL,
  `TLD_RTL` varchar(10) DEFAULT NULL,
  `TLD_SPONSOR` varchar(255) DEFAULT NULL,
  `TLD_FASTTRACK` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`TLD`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TOXIBOT_JOBS`
--

DROP TABLE IF EXISTS `TOXIBOT_JOBS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TOXIBOT_JOBS` (
  `JOB_ID` int NOT NULL AUTO_INCREMENT,
  `JOB_CREATED` datetime DEFAULT NULL,
  `REMOTE_ID` varchar(50) DEFAULT 'TEST',
  `JOB_PAYLOAD` mediumtext COMMENT 'BARCODE^LABEL',
  `JOB_COMPLETED` datetime DEFAULT NULL,
  PRIMARY KEY (`JOB_ID`),
  KEY `LK_REMOTE` (`REMOTE_ID`),
  KEY `LK_COMPLETED` (`JOB_COMPLETED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TRAFFIC`
--

DROP TABLE IF EXISTS `TRAFFIC`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TRAFFIC` (
  `TRAFFIC_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `TRAFFIC_CREATED` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `TRAFFIC_IP` varchar(50) NOT NULL DEFAULT '',
  `TRAFFIC_HOST` varchar(100) NOT NULL DEFAULT '',
  `TRAFFIC_REFERER` varchar(100) DEFAULT NULL,
  `TRAFFIC_ACTION` varchar(250) NOT NULL DEFAULT '',
  `TRAFFIC_DESTINATION` varchar(250) NOT NULL DEFAULT '',
  `TRAFFIC_AGENT` varchar(250) DEFAULT NULL,
  `TRAFFIC_GEO_CERTAINTY` int unsigned NOT NULL DEFAULT '0',
  `TRAFFIC_GEO_LAT` varchar(20) DEFAULT NULL,
  `TRAFFIC_GEO_LNG` varchar(20) DEFAULT NULL,
  `TRAFFIC_GEO_FQCN` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`TRAFFIC_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=91153 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TRAIL`
--

DROP TABLE IF EXISTS `TRAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TRAIL` (
  `TRAIL_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `TRAIL_CREATED` datetime DEFAULT NULL,
  `TRAIL_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `SPECIMEN_CODE` varchar(50) DEFAULT NULL,
  `TRAIL_DESCRIPTION` varchar(255) DEFAULT NULL,
  `TRAIL_SCRIPT` varchar(100) DEFAULT NULL,
  `TRAIL_SQL` mediumtext,
  `TRAIL_IP` varchar(20) DEFAULT NULL,
  `TRAIL_HOST` varchar(100) DEFAULT NULL,
  `TRAIL_REFERRER` varchar(255) DEFAULT NULL,
  `TRAIL_AGENT` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`TRAIL_ID`),
  KEY `LK_DESC` (`TRAIL_DESCRIPTION`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UNITS_TYPES`
--

DROP TABLE IF EXISTS `UNITS_TYPES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UNITS_TYPES` (
  `UNIT_ABBR` varchar(10) NOT NULL DEFAULT '',
  `SPECIMEN_TYPE` varchar(10) NOT NULL DEFAULT '',
  `UNIT_DESCRIPTION` varchar(50) DEFAULT NULL,
  `SPECIMEN_DESCRIPTION` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`UNIT_ABBR`,`SPECIMEN_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS`
--

DROP TABLE IF EXISTS `USERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS` (
  `USER_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `USER_ACTIVE` tinyint DEFAULT NULL,
  `USER_CREATED` datetime DEFAULT NULL,
  `USER_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `USER_UPDATED` datetime DEFAULT NULL,
  `USER_UPDATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `USER_ACTIVITY` datetime DEFAULT NULL,
  `_USER_LOGIN` varbinary(255) DEFAULT NULL,
  `USER_AUTOLOGIN` varchar(150) DEFAULT NULL,
  `USER_AUTOLOGIN_DESTINATION` varchar(200) DEFAULT '/',
  `USER_PASSWORD` varchar(255) DEFAULT NULL,
  `USER_PASSDATE` datetime DEFAULT '2030-12-31 00:00:00',
  `_USER_FNAME` varbinary(255) DEFAULT NULL,
  `_USER_MNAME` varbinary(255) DEFAULT NULL,
  `_USER_LNAME` varbinary(255) DEFAULT NULL,
  `_USER_SUFFIX` varbinary(255) DEFAULT NULL,
  `_USER_CREDENTIALS` varbinary(255) DEFAULT NULL,
  `_USER_TITLE` varbinary(255) DEFAULT NULL,
  `_USER_ORGANIZATION` varbinary(255) DEFAULT NULL,
  `USER_DOB` date DEFAULT NULL,
  `USER_GENDER` char(1) DEFAULT 'X',
  `USER_GENDENTITY` char(1) DEFAULT NULL,
  `_USER_EMAIL` varbinary(255) DEFAULT NULL,
  `_USER_EMAIL_CHANGE` varbinary(255) DEFAULT NULL,
  `_USER_PHONE` varbinary(255) DEFAULT NULL,
  `_USER_FAX` varbinary(255) DEFAULT NULL,
  `_USER_STREET1` varbinary(255) DEFAULT NULL,
  `_USER_STREET2` varbinary(255) DEFAULT NULL,
  `_USER_CITY` varbinary(255) DEFAULT NULL,
  `USER_STATE` varchar(50) DEFAULT NULL,
  `_USER_PROVINCE` varbinary(255) DEFAULT NULL,
  `_USER_POSTAL_CODE` varbinary(255) DEFAULT NULL,
  `USER_COUNTRY` char(2) DEFAULT 'US',
  `USER_TIMEZONE` varchar(50) DEFAULT NULL,
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  `USER_LAST_HOST` varchar(15) DEFAULT '0.0.0.0',
  `USER_LAST_AGENT` varchar(250) DEFAULT NULL,
  `USER_REFERRALS` int unsigned NOT NULL DEFAULT '0' COMMENT 'Number of Referred Members',
  `USER_REFERRED_BY` int unsigned NOT NULL DEFAULT '0' COMMENT 'Member Who Referred This User',
  `USER_GEO_CERTAINTY` int unsigned NOT NULL DEFAULT '0',
  `USER_GEO_LAT` varchar(20) DEFAULT NULL,
  `USER_GEO_LNG` varchar(20) DEFAULT NULL,
  `USER_GEO_FQCN` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`USER_ID`),
  UNIQUE KEY `LK_AUTOLOGIN` (`USER_AUTOLOGIN`),
  UNIQUE KEY `LK_USER_LOGIN` (`_USER_LOGIN`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS_ACCOUNTING`
--

DROP TABLE IF EXISTS `USERS_ACCOUNTING`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS_ACCOUNTING` (
  `USER_ID` int unsigned NOT NULL,
  `WORK_HEX` varchar(50) NOT NULL,
  `UA_CREATED` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `UA_DESCRIPTION` varchar(50) DEFAULT NULL,
  `UA_DEBIT` double(11,2) unsigned DEFAULT '0.00',
  `UA_CREDIT` double(11,2) unsigned DEFAULT '0.00',
  `UA_PURCHASE` double(11,2) unsigned DEFAULT '0.00',
  `UA_REFUND` double(11,2) unsigned DEFAULT '0.00',
  `UA_TXN_ID` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`USER_ID`,`WORK_HEX`,`UA_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS_ATTRIBUTES`
--

DROP TABLE IF EXISTS `USERS_ATTRIBUTES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS_ATTRIBUTES` (
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `ATTR_KEY` varchar(50) NOT NULL DEFAULT '',
  `ATTR_CREATED` datetime DEFAULT NULL,
  `ATTR_VALUE` mediumtext,
  `ATTR_SECURE` blob,
  `ATTR_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `ATTR_VISIBLE` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`USER_ID`,`ATTR_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS_GROUPS`
--

DROP TABLE IF EXISTS `USERS_GROUPS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS_GROUPS` (
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `GROUP_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`USER_ID`,`GROUP_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS_PATIENTS`
--

DROP TABLE IF EXISTS `USERS_PATIENTS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS_PATIENTS` (
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `PATIENT_ID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`USER_ID`,`PATIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS_PW_HISTORY`
--

DROP TABLE IF EXISTS `USERS_PW_HISTORY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS_PW_HISTORY` (
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `USER_PASSWORD` varchar(150) NOT NULL DEFAULT '',
  `UPH_CREATED` datetime DEFAULT NULL,
  PRIMARY KEY (`USER_ID`,`USER_PASSWORD`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `USERS_SIGNINS`
--

DROP TABLE IF EXISTS `USERS_SIGNINS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USERS_SIGNINS` (
  `US_ID` int NOT NULL AUTO_INCREMENT,
  `US_DATE` date DEFAULT NULL,
  `US_CREATED` datetime DEFAULT NULL,
  `US_UPDATED` datetime DEFAULT NULL,
  `USER_LOGIN` varchar(255) DEFAULT NULL,
  `USER_ID` int unsigned NOT NULL DEFAULT '0',
  `US_IP` varchar(50) DEFAULT NULL,
  `US_HOST` varchar(255) DEFAULT NULL,
  `US_REFERRER` varchar(255) DEFAULT NULL,
  `US_AGENT` varchar(255) DEFAULT NULL,
  `US_FAIL_COUNT` int unsigned NOT NULL DEFAULT '0',
  `US_BLACKLISTED` datetime DEFAULT NULL,
  PRIMARY KEY (`US_ID`),
  UNIQUE KEY `DATE_USER` (`US_DATE`,`USER_ID`),
  UNIQUE KEY `DATE_LOGIN` (`US_DATE`,`USER_LOGIN`)
) ENGINE=InnoDB AUTO_INCREMENT=287 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WORKLIST`
--

DROP TABLE IF EXISTS `WORKLIST`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WORKLIST` (
  `WORK_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `WORK_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `WORK_CREATED` datetime DEFAULT NULL,
  `WORK_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `WORK_HEX` varchar(50) DEFAULT NULL COMMENT 'WORK_ID + 500 converted to Hexadecimal',
  `TEMPLATE` varchar(50) DEFAULT NULL,
  `UNIQUE_ID` varchar(50) DEFAULT NULL,
  `FNAME` varchar(50) DEFAULT NULL,
  `LNAME` varchar(50) DEFAULT NULL,
  `TITLE` varchar(50) DEFAULT NULL,
  `ORGANIZATION` varchar(50) DEFAULT NULL,
  `SMS_NUMBER` varchar(50) DEFAULT NULL,
  `SMS_LAST_SENT` datetime DEFAULT NULL,
  `SMS_SID` varchar(255) DEFAULT NULL,
  `GEO_STATUS` varchar(50) DEFAULT NULL,
  `GEO_COORDS` varchar(255) DEFAULT NULL,
  `PROVIDER_NAME` varchar(50) DEFAULT NULL,
  `RETURN_PATH` varchar(255) DEFAULT NULL,
  `RETURN_STATUS` varchar(20) DEFAULT NULL,
  `WORK_COMPLETED` datetime DEFAULT NULL,
  `WORK_FILENAME` varchar(255) DEFAULT NULL,
  `WORK_FINAL_DOCUMENT` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`WORK_ID`),
  KEY `LK_WORK_HEX` (`WORK_HEX`),
  KEY `LK_COMPLETED` (`WORK_COMPLETED`),
  KEY `LK_CREATED` (`WORK_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WORKLIST_ARCHIVE`
--

DROP TABLE IF EXISTS `WORKLIST_ARCHIVE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WORKLIST_ARCHIVE` (
  `WORK_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `WORK_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `WORK_CREATED` datetime DEFAULT NULL,
  `WORK_CREATED_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `WORK_HEX` varchar(50) DEFAULT NULL COMMENT 'WORK_ID + 500 converted to Hexadecimal',
  `TEMPLATE` varchar(50) DEFAULT NULL,
  `UNIQUE_ID` varchar(50) DEFAULT NULL,
  `FNAME` varchar(50) DEFAULT NULL,
  `LNAME` varchar(50) DEFAULT NULL,
  `TITLE` varchar(50) DEFAULT NULL,
  `ORGANIZATION` varchar(50) DEFAULT NULL,
  `SMS_NUMBER` varchar(50) DEFAULT NULL,
  `SMS_LAST_SENT` datetime DEFAULT NULL,
  `SMS_SID` varchar(255) DEFAULT NULL,
  `GEO_STATUS` varchar(50) DEFAULT NULL,
  `GEO_COORDS` varchar(255) DEFAULT NULL,
  `PROVIDER_NAME` varchar(50) DEFAULT NULL,
  `RETURN_PATH` varchar(255) DEFAULT NULL,
  `RETURN_STATUS` varchar(20) DEFAULT NULL,
  `WORK_COMPLETED` datetime DEFAULT NULL,
  `WORK_FILENAME` varchar(255) DEFAULT NULL,
  `WORK_FINAL_DOCUMENT` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`WORK_ID`),
  KEY `LK_WORK_HEX` (`WORK_HEX`),
  KEY `LK_COMPLETED` (`WORK_COMPLETED`),
  KEY `LK_CREATED` (`WORK_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WORK_8888888888_LOG`
--

DROP TABLE IF EXISTS `WORK_8888888888_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WORK_8888888888_LOG` (
  `WORK_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `WORK_ACCESSION` varchar(12) NOT NULL DEFAULT '' COMMENT 'Format YYYY MM DD NNNN',
  `WORK_ACCESSION_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `WORK_ACCESSION_CREATED` datetime DEFAULT NULL,
  `SPECIMEN_CODE` varchar(50) DEFAULT NULL COMMENT 'FK -> SPECIMENS',
  `ORDER_ID` int unsigned DEFAULT '0' COMMENT 'FK -> ORDERS',
  `PATIENT_ID` int unsigned DEFAULT '0' COMMENT 'FK -> PATIENTS',
  `WORK_SERVICE_LIST` mediumtext,
  PRIMARY KEY (`WORK_ID`,`WORK_ACCESSION`),
  KEY `FK_PATIENT` (`PATIENT_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WORK_LOG_TEMPLATE`
--

DROP TABLE IF EXISTS `WORK_LOG_TEMPLATE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WORK_LOG_TEMPLATE` (
  `WORK_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `WORK_ACCESSION` varchar(12) NOT NULL DEFAULT '' COMMENT 'Format YYYY MM DD NNNN',
  `WORK_ACCESSION_USER_ID` int unsigned NOT NULL DEFAULT '0',
  `WORK_ACCESSION_CREATED` datetime DEFAULT NULL,
  `SPECIMEN_CODE` varchar(50) DEFAULT NULL COMMENT 'FK -> SPECIMENS',
  `ORDER_ID` int unsigned DEFAULT '0' COMMENT 'FK -> ORDERS',
  `PATIENT_ID` int unsigned DEFAULT '0' COMMENT 'FK -> PATIENTS',
  `WORK_SERVICE_LIST` mediumtext,
  PRIMARY KEY (`WORK_ID`,`WORK_ACCESSION`),
  KEY `FK_PATIENT` (`PATIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ZIPCODES`
--

DROP TABLE IF EXISTS `ZIPCODES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ZIPCODES` (
  `ZIPCODE` varchar(5) NOT NULL DEFAULT '',
  `CITY` varchar(50) DEFAULT NULL,
  `STATE_NAME` varchar(50) DEFAULT NULL,
  `STATE_CODE` char(2) DEFAULT NULL,
  `COUNTY` varchar(50) DEFAULT NULL,
  `LATTITUDE` double DEFAULT NULL,
  `LONGITUDE` double DEFAULT NULL,
  `SALES_TAX_RATE` decimal(10,4) DEFAULT '0.0000',
  PRIMARY KEY (`ZIPCODE`),
  KEY `LK_STATE` (`STATE_CODE`),
  KEY `LK_CITY` (`CITY`),
  KEY `LK_GEO` (`LATTITUDE`,`LONGITUDE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-16 10:30:50
