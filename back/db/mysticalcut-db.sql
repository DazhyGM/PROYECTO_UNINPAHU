-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 27-11-2026 a las 06:51:58
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `mysticalcut-db`
--
CREATE DATABASE IF NOT EXISTS `mysticalcut-db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `mysticalcut-db`;

DELIMITER $$
--
-- Procedimientos
--
DROP PROCEDURE IF EXISTS `sp_role_module`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_role_module` (IN `idRole` INT)   BEGIN
SELECT ROL.role_name AS `role_fk`,MD.module_name AS `role_module`,MD.module_icon,MD.module_description, MD.module_route FROM role_module AS RM 
INNER JOIN role AS ROL ON RM.role_fk=ROL.role_id
INNER JOIN module AS MD ON RM.module_fk=MD.module_id
WHERE ROL.role_id=idRole;
END$$

DROP PROCEDURE IF EXISTS `sp_user_all`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_all` ()   BEGIN
SELECT `user_email`, `user_id`,`full_name`,`user_password`, UST.userStatus_name AS `userStatus_fk`, ROL.role_name AS `role_fk` FROM `user` AS US  
INNER JOIN role AS ROL ON US.role_fk=ROL.role_id
INNER JOIN userstatus AS UST  ON US.userStatus_fk=UST.userStatus_id
WHERE US.userStatus_fk=1
;
END$$

DROP PROCEDURE IF EXISTS `sp_user_all_paginated`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_all_paginated` (IN `offset` INT, IN `limit_rows` INT)   BEGIN
    SET @query = CONCAT('SELECT * FROM user LIMIT ', `offset`, ', ', limit_rows);
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DROP PROCEDURE IF EXISTS `sp_user_count`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_count` ()   BEGIN
    SELECT COUNT(*) AS total_users 
    FROM user;
END$$

DROP PROCEDURE IF EXISTS `sp_user_create`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_create` (IN `p_user_email` VARCHAR(100), IN `p_user_password` VARCHAR(255), IN `p_full_name` VARCHAR(100), IN `p_userStatus_fk` VARCHAR(20), IN `p_role_fk` INT)   BEGIN
-- Si no se pasa el estado, se asigna el valor predeterminado 'activo'
    IF p_userStatus_fk IS NULL THEN
        SET p_userStatus_fk = 1;
    END IF;
    -- Si no se pasa el rol, se asigna el valor predeterminado 1
    IF p_role_fk IS NULL THEN
        SET p_role_fk = 3;
    END IF;

    -- Inserta el nuevo usuario con los valores proporcionados o los predeterminados
    INSERT INTO user (
         user_email, user_password, full_name, userStatus_fk, role_fk 
    ) 
    VALUES (
        
        p_user_email, 
        p_user_password, 
        p_full_name, 
        p_userStatus_fk,    -- Estado (si es NULL, se asigna 'activo')
        p_role_fk  -- Rol (si es NULL, se asigna 1)
        
    );
END$$

DROP PROCEDURE IF EXISTS `sp_user_search`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_search` (IN `dataSearch` VARCHAR(60))   BEGIN
SELECT `user_id`,`user_email`,`user_password`, UST.userStatus_name AS `userStatus_fk`, ROL.role_name AS `role_fk` FROM `user` AS US  
INNER JOIN role AS ROL ON US.role_fk=ROL.role_id
INNER JOIN userstatus AS UST  ON US.userStatus_fk=UST.userStatus_id 
WHERE ROL.role_name=dataSearch OR UST.userStatus_name=dataSearch OR US.user_email=dataSearch;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `barber_schedule`
--

DROP TABLE IF EXISTS `barber_schedule`;
CREATE TABLE IF NOT EXISTS `barber_schedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `barber_id` int(11) NOT NULL,
  `day_of_week` tinyint(4) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_start` time DEFAULT NULL,
  `break_end` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_barber_day` (`barber_id`,`day_of_week`),
  KEY `idx_barber_schedule_barber` (`barber_id`)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `barber_schedule`
--

TRUNCATE TABLE `barber_schedule`;
--
-- Volcado de datos para la tabla `barber_schedule`
--

INSERT INTO `barber_schedule` (`id`, `barber_id`, `day_of_week`, `start_time`, `end_time`, `break_start`, `break_end`) VALUES
(2, 12, 1, '08:00:00', '20:00:00', NULL, NULL),
(3, 13, 1, '08:00:00', '20:00:00', NULL, NULL),
(5, 15, 1, '08:00:00', '20:00:00', NULL, NULL),
(6, 16, 1, '08:00:00', '20:00:00', NULL, NULL),
(7, 43, 1, '08:00:00', '20:00:00', NULL, NULL),
(9, 12, 2, '08:00:00', '20:00:00', NULL, NULL),
(10, 13, 2, '08:00:00', '20:00:00', NULL, NULL),
(12, 15, 2, '08:00:00', '20:00:00', NULL, NULL),
(13, 16, 2, '08:00:00', '20:00:00', NULL, NULL),
(14, 43, 2, '08:00:00', '20:00:00', NULL, NULL),
(16, 12, 3, '08:00:00', '20:00:00', NULL, NULL),
(17, 13, 3, '08:00:00', '20:00:00', NULL, NULL),
(19, 15, 3, '08:00:00', '20:00:00', NULL, NULL),
(20, 16, 3, '08:00:00', '20:00:00', NULL, NULL),
(21, 43, 3, '08:00:00', '20:00:00', NULL, NULL),
(23, 12, 4, '08:00:00', '20:00:00', NULL, NULL),
(24, 13, 4, '08:00:00', '20:00:00', NULL, NULL),
(26, 15, 4, '08:00:00', '20:00:00', NULL, NULL),
(27, 16, 4, '08:00:00', '20:00:00', NULL, NULL),
(28, 43, 4, '08:00:00', '20:00:00', NULL, NULL),
(30, 12, 5, '08:00:00', '20:00:00', NULL, NULL),
(31, 13, 5, '08:00:00', '20:00:00', NULL, NULL),
(33, 15, 5, '08:00:00', '20:00:00', NULL, NULL),
(34, 16, 5, '08:00:00', '20:00:00', NULL, NULL),
(35, 43, 5, '08:00:00', '20:00:00', NULL, NULL),
(37, 12, 6, '08:00:00', '20:00:00', NULL, NULL),
(38, 13, 6, '08:00:00', '20:00:00', NULL, NULL),
(40, 15, 6, '08:00:00', '20:00:00', NULL, NULL),
(41, 16, 6, '08:00:00', '20:00:00', NULL, NULL),
(42, 43, 6, '08:00:00', '20:00:00', NULL, NULL),
(64, 14, 1, '08:00:00', '20:00:00', NULL, NULL),
(65, 14, 2, '08:00:00', '20:00:00', NULL, NULL),
(66, 14, 3, '08:00:00', '20:00:00', NULL, NULL),
(67, 14, 4, '08:00:00', '20:00:00', NULL, NULL),
(68, 14, 5, '08:00:00', '20:00:00', NULL, NULL),
(74, 11, 1, '08:00:00', '20:00:00', NULL, NULL),
(75, 11, 2, '08:00:00', '20:00:00', NULL, NULL),
(76, 11, 3, '08:00:00', '20:00:00', '13:00:00', '14:00:00'),
(77, 11, 4, '08:00:00', '20:00:00', NULL, NULL),
(78, 11, 0, '08:00:00', '12:00:00', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calificaciones`
--

DROP TABLE IF EXISTS `calificaciones`;
CREATE TABLE IF NOT EXISTS `calificaciones` (
  `id_calificacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_quotes` int(11) NOT NULL,
  `id_barbero` int(11) NOT NULL,
  `id_servicio` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `calificacion_servicio` tinyint(4) NOT NULL,
  `calificacion_barberia` tinyint(4) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_calificacion`),
  UNIQUE KEY `uq_calificacion_cita` (`id_quotes`),
  KEY `fk_calificacion_barbero` (`id_barbero`),
  KEY `fk_calificacion_servicio` (`id_servicio`),
  KEY `fk_calificacion_cliente` (`id_cliente`)
) ;

--
-- Truncar tablas antes de insertar `calificaciones`
--

TRUNCATE TABLE `calificaciones`;
--
-- Volcado de datos para la tabla `calificaciones`
--

INSERT INTO `calificaciones` (`id_calificacion`, `id_quotes`, `id_barbero`, `id_servicio`, `id_cliente`, `calificacion_servicio`, `calificacion_barberia`, `created_at`) VALUES
(2, 46, 11, 6, 47, 5, 5, '2026-11-08 02:19:46'),
(3, 47, 11, 6, 47, 5, 5, '2026-11-08 02:20:10'),
(4, 48, 43, 6, 47, 5, 5, '2026-11-08 02:21:00'),
(5, 42, 12, 7, 47, 5, 4, '2026-11-08 02:22:01'),
(7, 41, 12, 7, 47, 5, 5, '2026-11-08 02:29:09'),
(8, 40, 12, 6, 47, 5, 5, '2026-11-08 02:29:28'),
(9, 52, 43, 6, 47, 5, 5, '2026-11-08 03:33:50'),
(10, 58, 11, 6, 47, 5, 5, '2026-11-21 04:01:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calificaciones_cliente`
--

DROP TABLE IF EXISTS `calificaciones_cliente`;
CREATE TABLE IF NOT EXISTS `calificaciones_cliente` (
  `id_calificacion_cliente` int(11) NOT NULL AUTO_INCREMENT,
  `id_quotes` int(11) NOT NULL,
  `id_barbero` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `id_servicio` int(11) NOT NULL,
  `calificacion_cliente` tinyint(4) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_calificacion_cliente`),
  UNIQUE KEY `uq_calificacion_cliente_cita` (`id_quotes`),
  KEY `fk_calcli_barbero` (`id_barbero`),
  KEY `fk_calcli_cliente` (`id_cliente`),
  KEY `fk_calcli_servicio` (`id_servicio`)
) ;

--
-- Truncar tablas antes de insertar `calificaciones_cliente`
--

TRUNCATE TABLE `calificaciones_cliente`;
--
-- Volcado de datos para la tabla `calificaciones_cliente`
--

INSERT INTO `calificaciones_cliente` (`id_calificacion_cliente`, `id_quotes`, `id_barbero`, `id_cliente`, `id_servicio`, `calificacion_cliente`, `created_at`) VALUES
(2, 48, 43, 47, 6, 5, '2026-11-08 02:40:12'),
(3, 52, 43, 47, 6, 5, '2026-11-08 03:32:43');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `category_product`
--

DROP TABLE IF EXISTS `category_product`;
CREATE TABLE IF NOT EXISTS `category_product` (
  `id_category` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `category_product`
--

TRUNCATE TABLE `category_product`;
--
-- Volcado de datos para la tabla `category_product`
--

INSERT INTO `category_product` (`id_category`, `name`) VALUES
(1, 'Cabello'),
(2, 'Belleza'),
(3, 'Tintes y Coloración'),
(4, 'Tratamientos Capilares'),
(5, 'Productos de Estilo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `category_services`
--

DROP TABLE IF EXISTS `category_services`;
CREATE TABLE IF NOT EXISTS `category_services` (
  `id_category_services` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_category_services`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `category_services`
--

TRUNCATE TABLE `category_services`;
--
-- Volcado de datos para la tabla `category_services`
--

INSERT INTO `category_services` (`id_category_services`, `name`) VALUES
(1, 'Cortes'),
(2, 'Barba'),
(3, 'Cejas'),
(4, 'Tintes'),
(5, 'Combos');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consumo_insumo`
--

DROP TABLE IF EXISTS `consumo_insumo`;
CREATE TABLE IF NOT EXISTS `consumo_insumo` (
  `id_consumo` int(11) NOT NULL AUTO_INCREMENT,
  `id_product` int(11) NOT NULL,
  `id_barbero` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_consumo`),
  UNIQUE KEY `uk_consumo_dia` (`id_barbero`,`id_product`,`fecha`),
  KEY `fk_consumo_product` (`id_product`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `consumo_insumo`
--

TRUNCATE TABLE `consumo_insumo`;
--
-- Volcado de datos para la tabla `consumo_insumo`
--

INSERT INTO `consumo_insumo` (`id_consumo`, `id_product`, `id_barbero`, `cantidad`, `fecha`, `creado_en`) VALUES
(1, 2, 11, 1, '2026-11-27', '2026-11-27 00:14:58'),
(2, 1, 11, 0, '2026-11-27', '2026-11-27 00:14:58'),
(3, 5, 11, 0, '2026-11-27', '2026-11-27 00:14:58'),
(4, 3, 11, 0, '2026-11-27', '2026-11-27 00:14:58'),
(5, 4, 11, 0, '2026-11-27', '2026-11-27 00:14:58'),
(6, 8, 11, 0, '2026-11-27', '2026-11-27 00:14:58'),
(7, 7, 11, 0, '2026-11-27', '2026-11-27 00:14:58'),
(8, 6, 11, 0, '2026-11-27', '2026-11-27 00:14:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `document_type`
--

DROP TABLE IF EXISTS `document_type`;
CREATE TABLE IF NOT EXISTS `document_type` (
  `id_doctypes` int(11) NOT NULL AUTO_INCREMENT,
  `doctype_name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_doctypes`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `document_type`
--

TRUNCATE TABLE `document_type`;
--
-- Volcado de datos para la tabla `document_type`
--

INSERT INTO `document_type` (`id_doctypes`, `doctype_name`) VALUES
(1, 'Cedula de ciudadania'),
(2, 'Tarjeta de identidad'),
(3, 'Cedula de extranjeria');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dotacion`
--

DROP TABLE IF EXISTS `dotacion`;
CREATE TABLE IF NOT EXISTS `dotacion` (
  `id_dotacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_product` int(11) NOT NULL,
  `id_barbero` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_dotacion`),
  UNIQUE KEY `uk_dotacion_barbero_product` (`id_barbero`,`id_product`),
  KEY `fk_dotacion_product` (`id_product`),
  KEY `fk_dotacion_barbero` (`id_barbero`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `dotacion`
--

TRUNCATE TABLE `dotacion`;
--
-- Volcado de datos para la tabla `dotacion`
--

INSERT INTO `dotacion` (`id_dotacion`, `id_product`, `id_barbero`, `cantidad`) VALUES
(4, 2, 11, 1),
(5, 1, 11, 2),
(6, 5, 11, 2),
(7, 3, 11, 2),
(8, 4, 11, 2),
(9, 8, 11, 2),
(10, 7, 11, 2),
(11, 6, 11, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `module`
--

DROP TABLE IF EXISTS `module`;
CREATE TABLE IF NOT EXISTS `module` (
  `module_id` int(11) NOT NULL AUTO_INCREMENT,
  `module_name` varchar(20) NOT NULL,
  `module_route` varchar(20) NOT NULL,
  `module_icon` varchar(40) NOT NULL,
  `module_description` varchar(200) NOT NULL,
  PRIMARY KEY (`module_id`),
  UNIQUE KEY `module_name` (`module_name`),
  UNIQUE KEY `module_route` (`module_route`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `module`
--

TRUNCATE TABLE `module`;
--
-- Volcado de datos para la tabla `module`
--

INSERT INTO `module` (`module_id`, `module_name`, `module_route`, `module_icon`, `module_description`) VALUES
(1, 'Home', 'home/home', '<i class=\"bi bi-house-fill\"></i>', 'This is module home'),
(2, 'User', 'user/index', '<i class=\"bi bi-person-badge-fill\"></i>', 'This is module user'),
(3, 'Servicio', 'services/index', '<i class=\"bi bi-clipboard-check\"></i>', 'This is module facture');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `product`
--

DROP TABLE IF EXISTS `product`;
CREATE TABLE IF NOT EXISTS `product` (
  `id_product` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `price` float NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `id_category` int(11) DEFAULT NULL,
  `id_status` int(11) NOT NULL DEFAULT 1,
  `image` varchar(255) DEFAULT NULL,
  `comprobante` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_product`),
  KEY `fk_categoria` (`id_category`),
  KEY `fk_product_status` (`id_status`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `product`
--

TRUNCATE TABLE `product`;
--
-- Volcado de datos para la tabla `product`
--

INSERT INTO `product` (`id_product`, `name`, `price`, `description`, `amount`, `id_category`, `id_status`, `image`, `comprobante`) VALUES
(1, 'Cepillo capilar', 15000, 'Cepillo para cabello delicado', 10, 1, 1, 'cepillo.jpg', NULL),
(2, 'Cuchillas de afeitar', 10000, 'Cuchilla para afeitar barbas o cabello', 14, 2, 1, 'image-1795757129144-460693086.jfif', NULL),
(3, 'Cera para cabello', 30000, 'Cera para cabello de macho bello', 5, 1, 1, 'image-1770175934248-67742671.png', NULL),
(4, 'Crema de barba', 50000, 'Crema para depilacion de barba', 3, 2, 1, 'image-1770176008054-234384581.jpg', NULL),
(5, 'Cera brillante', 35000, 'Cera brillante para el cabello', 20, 5, 1, 'image-1770176090017-663102808.jpg', NULL),
(6, 'Tratamiento capilar', 28000, 'Tratamiento para el pelo para tenerlo lindo', 12, 1, 1, 'image-1770176224964-513076674.jpg', NULL),
(7, 'Shampoo anticaida', 28000, 'Shampo anticaida para que no caigas en las mentiras de tu ex', 12, 1, 1, 'image-1770176252239-493672053.jpg', NULL),
(8, 'Minoxidil barba', 28000, 'Minoxidil para que te crezca una barba de vikingo', 12, 1, 1, 'image-1770176296806-481801453.jpg', NULL),
(9, 'Maquina re Chimba', 28000, 'Para gente re chimba', 12, 1, 3, 'barbero4.jpg', NULL),
(11, 'Maquina re Chimba', 28000, 'Para gente re chimba', 12, 1, 3, 'barbero1.jpg', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `product_status`
--

DROP TABLE IF EXISTS `product_status`;
CREATE TABLE IF NOT EXISTS `product_status` (
  `id_status` int(11) NOT NULL AUTO_INCREMENT,
  `name_status` varchar(50) NOT NULL,
  PRIMARY KEY (`id_status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `product_status`
--

TRUNCATE TABLE `product_status`;
--
-- Volcado de datos para la tabla `product_status`
--

INSERT INTO `product_status` (`id_status`, `name_status`) VALUES
(1, 'Active'),
(2, 'Spent'),
(3, 'Inactive');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `quotes`
--

DROP TABLE IF EXISTS `quotes`;
CREATE TABLE IF NOT EXISTS `quotes` (
  `id_quotes` int(11) NOT NULL AUTO_INCREMENT,
  `date_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `end_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `state_quotes` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `barber_id` int(11) NOT NULL,
  `id_services` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_quotes`),
  KEY `fk_appointment_user` (`user_id`),
  KEY `fk_quotes_services` (`id_services`),
  KEY `fk_barber_user` (`barber_id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `quotes`
--

TRUNCATE TABLE `quotes`;
--
-- Volcado de datos para la tabla `quotes`
--

INSERT INTO `quotes` (`id_quotes`, `date_time`, `end_time`, `state_quotes`, `user_id`, `barber_id`, `id_services`) VALUES
(1, '2025-04-21 03:11:41', '2025-04-20 13:30:00', 'pendiente', 6, 11, 6),
(2, '2025-04-21 03:26:44', '2025-04-20 14:30:00', 'finalizada', 6, 12, 11),
(3, '2025-04-21 03:27:07', '2025-04-20 13:15:00', 'finalizada', 6, 13, 16),
(4, '2025-04-20 13:00:00', '2025-04-20 13:45:00', 'pendiente', 6, 14, 21),
(5, '2025-04-20 13:00:00', '2025-04-20 13:50:00', 'pendiente', 6, 15, 26),
(6, '2025-04-20 14:00:00', '2025-04-20 14:30:00', 'pendiente', 7, 11, 6),
(7, '2025-04-20 15:00:00', '2025-04-20 16:30:00', 'pendiente', 7, 12, 11),
(8, '2025-04-20 14:00:00', '2025-04-20 14:15:00', 'pendiente', 7, 13, 16),
(9, '2025-04-20 15:00:00', '2025-04-20 15:45:00', 'pendiente', 7, 14, 21),
(10, '2025-04-20 14:00:00', '2025-04-20 14:50:00', 'pendiente', 7, 15, 26),
(11, '2025-04-21 13:00:00', '2025-04-21 13:30:00', 'pendiente', 8, 11, 6),
(12, '2025-04-21 14:00:00', '2025-04-21 15:30:00', 'pendiente', 8, 12, 11),
(13, '2025-04-21 03:27:06', '2025-04-21 15:15:00', 'finalizada', 8, 13, 16),
(14, '2025-04-21 03:27:27', '2025-04-21 16:45:00', 'cancelada', 8, 14, 21),
(15, '2025-04-21 03:27:43', '2025-04-22 20:50:00', 'finalizada', 8, 15, 26),
(16, '2025-04-21 03:26:16', '2025-04-23 13:30:00', 'finalizada', 9, 11, 6),
(17, '2025-04-21 03:26:45', '2025-04-21 01:30:00', 'cancelada', 9, 12, 11),
(18, '2025-04-21 00:00:00', '2025-04-21 00:15:00', 'pendiente', 9, 13, 16),
(19, '2025-04-20 23:00:00', '2025-04-21 00:00:00', 'pendiente', 9, 14, 22),
(20, '2025-04-21 00:00:00', '2025-04-21 01:15:00', 'pendiente', 9, 15, 29),
(21, '2025-04-21 03:26:12', '2025-04-24 13:30:00', 'cancelada', 10, 11, 6),
(22, '2025-04-21 03:26:43', '2025-04-22 13:50:00', 'cancelada', 10, 12, 13),
(23, '2025-04-21 03:27:05', '2025-04-30 13:30:00', 'cancelada', 10, 13, 18),
(24, '2025-04-21 03:27:25', '2025-04-26 14:00:00', 'finalizada', 10, 14, 22),
(25, '2025-04-21 03:27:42', '2025-04-30 13:45:00', 'cancelada', 10, 15, 27),
(26, '2025-04-22 13:00:00', '2025-04-22 13:35:00', 'pendiente', 6, 11, 7),
(29, '2026-02-28 03:01:52', '2025-07-31 22:30:00', 'cancelada', 39, 11, 6),
(31, '2026-02-28 16:00:00', '2026-02-28 16:30:00', 'pendiente', 6, 11, 6),
(32, '2026-02-28 20:27:32', '2026-02-28 22:30:00', 'cancelada', 1, 11, 6),
(33, '2026-02-28 13:00:00', '2026-02-28 14:30:00', 'pendiente', 6, 11, 30),
(34, '2026-02-28 23:00:00', '2026-02-28 23:30:00', 'pendiente', 6, 11, 6),
(35, '2026-03-01 00:00:00', '2026-03-01 00:30:00', 'pendiente', 6, 11, 6),
(36, '2026-03-02 13:00:00', '2026-03-02 13:30:00', 'pendiente', 6, 11, 6),
(37, '2026-08-28 03:30:32', '2026-08-28 15:10:00', 'cancelada', 46, 14, 17),
(38, '2026-08-28 03:32:16', '2026-08-28 17:10:00', 'finalizada', 46, 14, 17),
(39, '2026-08-28 16:00:00', '2026-08-28 16:15:00', 'pendiente', 44, 14, 16),
(40, '2026-11-08 02:29:20', '2026-08-31 13:30:00', 'finalizada', 47, 12, 6),
(41, '2026-11-08 02:28:49', '2026-08-31 14:35:00', 'finalizada', 47, 12, 7),
(42, '2026-11-08 02:21:49', '2026-08-31 15:35:00', 'finalizada', 47, 12, 7),
(43, '2026-11-06 01:56:26', '2026-08-31 13:25:00', 'cancelada', 47, 13, 9),
(44, '2026-08-31 13:00:00', '2026-08-31 13:30:00', 'pendiente', 47, 11, 10),
(45, '2026-10-15 13:00:00', '2026-10-15 13:30:00', 'pendiente', 44, 11, 6),
(46, '2026-11-08 01:18:09', '2026-11-08 01:30:00', 'finalizada', 47, 11, 6),
(47, '2026-11-08 02:19:57', '2026-11-07 13:30:00', 'finalizada', 47, 11, 6),
(48, '2026-11-08 02:20:38', '2026-11-07 13:30:00', 'finalizada', 47, 43, 6),
(52, '2026-11-08 03:32:03', '2026-11-09 23:30:00', 'finalizada', 47, 43, 6),
(53, '2026-11-10 16:00:00', '2026-11-10 17:10:00', 'pendiente', 46, 12, 23),
(54, '2026-11-09 13:00:00', '2026-11-09 13:25:00', 'pendiente', 46, 14, 9),
(55, '2026-11-11 17:00:00', '2026-11-11 17:30:00', 'pendiente', 46, 14, 18),
(56, '2026-11-11 13:00:00', '2026-11-11 13:30:00', 'pendiente', 46, 11, 6),
(57, '2026-11-21 14:00:00', '2026-11-21 14:30:00', 'pendiente', 47, 12, 6),
(58, '2026-11-21 04:00:51', '2026-11-25 13:30:00', 'finalizada', 47, 11, 6),
(59, '2026-12-02 00:00:00', '2026-12-02 00:35:00', 'pendiente', 47, 11, 7);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role`
--

DROP TABLE IF EXISTS `role`;
CREATE TABLE IF NOT EXISTS `role` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(20) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `role`
--

TRUNCATE TABLE `role`;
--
-- Volcado de datos para la tabla `role`
--

INSERT INTO `role` (`role_id`, `role_name`) VALUES
(1, 'Admin'),
(3, 'Client'),
(2, 'Employee');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_module`
--

DROP TABLE IF EXISTS `role_module`;
CREATE TABLE IF NOT EXISTS `role_module` (
  `roleModule_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_fk` int(11) NOT NULL,
  `module_fk` int(11) NOT NULL,
  PRIMARY KEY (`roleModule_id`),
  KEY `role_module_role` (`role_fk`),
  KEY `role_module_module` (`module_fk`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `role_module`
--

TRUNCATE TABLE `role_module`;
--
-- Volcado de datos para la tabla `role_module`
--

INSERT INTO `role_module` (`roleModule_id`, `role_fk`, `module_fk`) VALUES
(1, 1, 1),
(2, 1, 2),
(3, 2, 1),
(4, 3, 1),
(5, 1, 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `services`
--

DROP TABLE IF EXISTS `services`;
CREATE TABLE IF NOT EXISTS `services` (
  `id_services` int(11) NOT NULL AUTO_INCREMENT,
  `name_service` varchar(255) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `estimated_time` time DEFAULT NULL,
  `price` float DEFAULT NULL,
  `id_category_services` int(11) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `id_status` int(11) DEFAULT 1,
  PRIMARY KEY (`id_services`),
  KEY `fk_categoria_Servicios` (`id_category_services`),
  KEY `fk_status` (`id_status`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `services`
--

TRUNCATE TABLE `services`;
--
-- Volcado de datos para la tabla `services`
--

INSERT INTO `services` (`id_services`, `name_service`, `description`, `estimated_time`, `price`, `id_category_services`, `image`, `id_status`) VALUES
(1, 'Corte Clásico', 'Corte clasico para gente wapa', '00:30:00', 15000, 1, 'barbero1.jpg', 2),
(2, 'Afeitado Tradicional', 'Afeitado tranquilon para gente wapa', '00:20:00', 10, 2, NULL, 2),
(3, 'Tinte Capilar', 'Tinte bien mamalon para gente wapa', '01:00:00', 40, 4, NULL, 1),
(4, 'Tratamiento Hidratan', 'Tratamiento que hidrata para gente wapa', '00:45:00', 25, 4, NULL, 2),
(5, 'Corte Infantil', 'Corte infantil para niños bien wapos', '00:25:00', 12000, 5, NULL, 2),
(6, 'Corte Clásico', 'Corte tradicional con acabado limpio y elegante.', '00:30:00', 20000, 1, 'image-1794106202854-18505472.jpg', 1),
(7, 'Fade Bajo', 'Degradado bajo con diseño moderno y perfilado incluido.', '00:35:00', 22000, 1, 'image-1794106331653-25981107.jpg', 1),
(8, 'Corte con Tijera', 'Corte completo realizado solo con tijera, ideal para cabello largo.', '00:40:00', 25000, 1, 'image-1794106439825-295825754.jpg', 1),
(9, 'Corte Infantil', 'Corte para niños con técnicas suaves y amigables.', '00:25:00', 15000, 1, 'image-1794106706351-41065488.jpg', 1),
(10, 'Corte Ejecutivo', 'Corte formal y profesional para hombres de oficina.', '00:30:00', 20000, 1, 'image-1794106836695-748523115.jpg', 1),
(11, 'Perfilado de Barba', 'Perfilado de contorno con máquina y navaja.', '01:30:00', 12000, 2, 'image-1794106914544-863990355.jpg', 1),
(12, 'Afeitado Tradicional', 'Afeitado completo con toalla caliente y crema especial.', '00:55:00', 15000, 2, 'image-1794106975987-668165062.jpg', 1),
(13, 'Diseño de Barba', 'Estilizado personalizado con formas y detalles.', '00:50:00', 18000, 2, 'image-1794107055295-906275346.jpg', 1),
(14, 'Mantenimiento de Barba', 'Recorte y limpieza general de barba.', '01:40:00', 10000, 2, NULL, 1),
(15, 'Diseño Barba', 'Tratamiento de barba con hidratación y aceites esenciales.', '01:30:00', 60000, 2, NULL, 1),
(16, 'Diseño de Cejas Masculino', 'Limpieza y forma natural, adaptado al rostro masculino.', '00:15:00', 10000, 3, 'image-1794107143285-379939214.jpg', 1),
(17, 'Depilación con Cera', 'Eliminación de exceso de vello con cera fría o caliente.', '00:10:00', 8000, 3, 'image-1794107353224-439995405.jpg', 1),
(18, 'Cejas con Pinza', 'Eliminación de exceso de vello con cera fría o caliente.', '00:30:00', 9000, 3, 'image-1794107405754-985239378.jpg', 1),
(19, 'Diseño Artístico de Cejas', 'Forma más estilizada y estética con simetría.', '00:20:00', 12000, 3, NULL, 1),
(20, 'Retoque de Cejas', 'Descripción: Mantenimiento rápido para conservar el diseño.', '00:10:00', 10000, 3, NULL, 1),
(21, 'Tinte para Canas', 'Cobertura total de canas con color natural.', '00:45:00', 30000, 4, 'image-1794107577451-984995418.jpg', 1),
(22, 'Color Fantasía', 'Aplicación de colores vivos como azul, rojo o verde.', '01:00:00', 45000, 4, 'image-1794107618785-679989777.jpg', 1),
(23, 'Reflejos o Iluminaciones', 'Aclaración parcial para dar brillo y textura.', '01:10:00', 50000, 4, 'image-1794107889589-227912312.jpg', 1),
(24, 'Baño de Color', 'Refrescamiento del tono actual sin dañar el cabello.', '00:40:00', 28000, 4, 'image-1794107834455-786415052.jpg', 1),
(25, 'Tinte Negro Intenso', ' Aplicación de negro profundo con brillo duradero.', '00:45:00', 32000, 4, 'image-1794107760353-996426901.jpg', 1),
(26, 'Corte + Barba', 'Servicio completo con corte y perfilado de barba.', '00:50:00', 30000, 5, NULL, 1),
(27, 'Corte + Cejas', 'Corte moderno y diseño de cejas incluidos.', '00:45:00', 28000, 5, NULL, 1),
(28, 'Corte + Barba + Cejas', 'Paquete para renovar tu estilo completo.', '01:00:00', 40000, 5, NULL, 1),
(29, 'Corte + Tinte', 'Corte más aplicación de tinte del color que elijas.', '01:15:00', 50000, 5, NULL, 1),
(30, 'Combo Deluxe (Todo incluido)', 'Corte, barba, cejas, tinte y lavado. Experiencia completa.', '01:30:00', 100000, 5, NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `service_status`
--

DROP TABLE IF EXISTS `service_status`;
CREATE TABLE IF NOT EXISTS `service_status` (
  `id_status` int(11) NOT NULL,
  `name_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `service_status`
--

TRUNCATE TABLE `service_status`;
--
-- Volcado de datos para la tabla `service_status`
--

INSERT INTO `service_status` (`id_status`, `name_status`) VALUES
(1, 'Active'),
(2, 'Inactive');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `type_of_quotes`
--

DROP TABLE IF EXISTS `type_of_quotes`;
CREATE TABLE IF NOT EXISTS `type_of_quotes` (
  `id_quotes` int(11) NOT NULL,
  `id_services` int(11) NOT NULL,
  `barber_id` int(11) DEFAULT NULL,
  KEY `fk_type_citation_citation` (`id_quotes`),
  KEY `fk_type_appointment_service` (`id_services`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `type_of_quotes`
--

TRUNCATE TABLE `type_of_quotes`;
-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_email` varchar(30) NOT NULL,
  `user_password` varchar(256) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `document_number` varchar(20) NOT NULL,
  `userStatus_fk` int(11) NOT NULL,
  `role_fk` int(11) NOT NULL,
  `type_document_id` int(11) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `reset_token` varchar(64) DEFAULT NULL,
  `reset_token_expires` bigint(20) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_email` (`user_email`),
  UNIQUE KEY `unique_document` (`document_number`),
  KEY `user_role` (`role_fk`),
  KEY `user_status` (`userStatus_fk`),
  KEY `fk_id_tipo_docuemnto_User` (`type_document_id`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `user`
--

TRUNCATE TABLE `user`;
--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`user_id`, `user_email`, `user_password`, `full_name`, `document_number`, `userStatus_fk`, `role_fk`, `type_document_id`, `address`, `phone`, `reset_token`, `reset_token_expires`, `profile_image`) VALUES
(1, 'kevin@gmail.com', '$2b$10$uEGzJgmC8P7RZPv7x.uCR.KQjFuFXlQDj43QNBIb6tk1k5TrvpGh6', 'Kevin', '1000619691', 1, 1, 1, 'Carrera 14 #22-46', '3003113203', NULL, NULL, NULL),
(5, 'admin@gmail.com', '$2b$10$KfluppChqXKJ/LywSYglc.xM.B5ZlhWRvQF1T2OrofFMJoqUqCnaC', 'Administrador', '7142565', 1, 1, 1, 'Carrera 14 #22-49', '12345678', NULL, NULL, NULL),
(6, 'juan.perez@email.com', '$2b$10$eukDCrAnH5VEzSrtiPd09utHjQxtDjwcyg.0Tp9c0WcApU6PcKSAu', 'Juan Pérez', '12345678', 1, 3, 1, 'Calle Falsa 123, Ciudad', '612345678', NULL, NULL, NULL),
(7, 'maria.gomez@email.com', '$2b$10$yr26ZIDnfAZrmKEGRPF7jOjiZCQVuFaKtAJ2UfA5gshQMyYSpwHpq', 'María Gómez', '23456789', 2, 3, 2, 'Avenida Siempre Viva 456, Ciudad', '623056789', NULL, NULL, NULL),
(8, 'carlos.rodriguez@email.com', '$2b$10$.WyXUBn0TcdPV.Gipg.zGuYOJXzmWhUtcEVBDIwUDc3UPU5uZMD1G', 'Carlos Rodríguez', '34567890', 1, 3, 3, 'Plaza Mayor 789, Ciudad', '634567890', NULL, NULL, NULL),
(9, 'ana.martinez@email.com', '$2b$10$o.MzU40UWg0bciyb/KiZ8uJdf9A3uUkQOib8rezB1JrkNW4eHjXDq', 'Ana Martínez', '45678901', 2, 3, 2, 'Calle de la Luna 101, Ciudad', '645678901', NULL, NULL, NULL),
(10, 'pedro.sanchez@email.com', '$2b$10$rKj6PdoyMn2NWXuiHu89OeKTiFvu0Gtu5Awt57WRpKKgw1LovzcRa', 'Pedro Sánchez', '56789012', 1, 3, 2, 'Calle Sol 202, Ciudad', '656789012', NULL, NULL, NULL),
(11, 'alberto.diaz@email.com', '$2b$10$lLTvn2EkHYfaSUEes4bmFOOxLaUyFqje9yUegIfLJ2d9d5/vQxjjK', 'Alberto Díaz', '87654321', 1, 2, 1, 'Calle del Río 10, Ciudad', '654321987', NULL, NULL, NULL),
(12, 'beatriz.lopez@email.com', '$2b$10$oMkSObP9WG.iNOHMGGItIeFoSsqlBj2oNEbHPBf0UB5uMRUTuERXm', 'Beatriz López', '98765432', 1, 2, 1, 'Avenida de la Paz 22, Ciudad', '665432198', NULL, NULL, NULL),
(13, 'carlos.torres@email.com', '$2b$10$ZGRDW/HHXY1LnP0yW2Z6KODhGgZex8RNvKx0itTHGcPGThgxZjeMq', 'Carlos Torres', '19876543', 1, 2, 1, 'Calle del Mar 33, Ciudad', '676543209', NULL, NULL, NULL),
(14, 'diana.perez@email.com', '$2b$10$t4UdON04AcTKY4sCqpi53usYtl2HDxF2ZxIi5Ia2E6NIuLHb3sDeO', 'Diana Pérez', '20987654', 1, 2, 1, 'Calle del Sol 44, Ciudad', '687654320', NULL, NULL, NULL),
(15, 'enrique.garcia@email.com', '$2b$10$VTQ5TnBD6NICQYpbv.Z4feZdWx5yIm1R.0wwY4ZJ6zqZ7pOt8avIS', 'Enrique García', '32098765', 1, 2, 1, 'Plaza del Mercado 55, Ciudad', '698765431', NULL, NULL, NULL),
(16, 'laura.ramirez@email.com', '$2b$10$ijDdJ9OHJDcVKR59GB1zvuyaOpuUducPKMyF7HyTdQ6z0oV2/43NO', 'Laura Ramírez', '67890123', 3, 2, 1, 'Calle del Bosque 77, Ciudad', '667890123', NULL, NULL, NULL),
(17, 'jorge.herrera@email.com', '$2b$10$o4RCNURGkNWXiuBnJpy2n.f01WJEV7I.daoJb9SPoVgNzHQZP0dwC', ' Jorge Herrera', '78901234', 3, 1, 2, 'Avenida Central 88, Ciudad', '678901234', NULL, NULL, NULL),
(18, 'valentina.castro@email.com', '$2b$10$Gdit8uwRC04sI6TGoUUsBeyHs5w360aCpfG0CGUkNEzuuSKat9IFK', 'Valentina Castro', '89012345', 3, 3, 3, 'Calle del Lago 99, Ciudad', '689012345', NULL, NULL, NULL),
(19, 'andres.molina@email.com', '$2b$10$usQTEFETGKcMXBskewLRiOf2PJ2R4zG9DHWAyHNSp0b1p3oygzJAW', 'Andrés Molina', '90123456', 3, 3, 1, 'Calle Primavera 100, Ciudad', '690123456', NULL, NULL, NULL),
(20, 'camila.navarro@email.com', '$2b$10$4o9ylGQZpIp.piAWI8N/h.Sbql32aIYU9uUzQbGwuenY4NsZAvzse', 'Camila Navarro', '11223344', 3, 3, 2, 'Calle del Olivo 111, Ciudad', '611223344', NULL, NULL, NULL),
(21, 'prueba1@gmail.com', '$2b$10$Zh4yfNiGtm3j2/UTmm5hPub4lH5oGozNuOnvF1GUPSALWNv6tk4/O', 'Prueba Prueba', '1000222333', 4, 3, 2, 'Calle 50 #34-45', '3201122323', NULL, NULL, NULL),
(22, 'Bot-services@gmail.com', '$2b$10$JfXLLLE/tbvjjLiElJnyHOswupMPtiuLVVPDZEAnuLIq8hy0jtdcm', 'Bot Automati', '1655852236', 1, 3, 1, 'Carrera 11 J b #98 - 70', '3003113255', NULL, NULL, NULL),
(38, 'coreodervicios@gmail.com', '$2b$10$QdkM65dA.iBukUK5Z28q9eV65cSlMEqIzHzdNHnus0KsOfUYuH/bC', 'BOT-Servicios', '1618293684', 1, 3, 1, 'Carrera 14 #22-47', '3209241732', NULL, NULL, NULL),
(39, 'UsuariodePrueba20225@gmail.com', '$2b$10$gumvp5Yqq0vhSKSs7dh83.sjyL/ec57PmBzR/QpI9sllLLgmPVEMG', 'usuario de Prueba', '1000621120', 1, 3, 1, 'Carrera 14 #22-59', '3209241739', NULL, NULL, NULL),
(40, 'mocaco@gmail.com', '$2b$10$7bevJojAS9.DUvsaGgqR8O6WybCbAaJwrIs6B5ydMDHGVcgsQx0v2', 'Mocaco mocaco', '1555202236', 1, 3, 1, 'Carrera 11 m Bis # 43 - 40 Sur', '3203206565', NULL, NULL, NULL),
(43, 'usuario.employee@gmail.com', '$2b$10$X8Q1ACKOiE1VdGEuI.DVzuNS49Y7kws6uioeMjRRppYrQ7pH3/zC.', 'Usuario Empleado', '1000112012', 1, 2, 1, 'Trans 12 C Bis #43-40', '3003113203', NULL, NULL, NULL),
(44, 'usuario.client@gmail.com', '$2b$10$AbR9/71fcwjO5q0KIyUVueR5RHH4YuDIe/rw82ZLFAE4YliYbnKdC', 'Usuario Cliente', '1001001000', 1, 3, 1, 'Carrera 11 bis # 43 sur', '12345678', NULL, NULL, NULL),
(45, 'usuario.admin@gmail.com', '$2b$10$wPjShyqSiGwRAha1ETWYfewMqM6k2vAZDRy2gn0QxwzfbGeVn57gi', 'Usuario Admin', '1000002323', 1, 1, 1, 'Trans 12 Bis #43', '3003113203', NULL, NULL, NULL),
(46, 'dr4356752@gmail.com', '$2b$10$0Oj300J2MqTIAOKpPo8MHuOQx24/0whXzONi7mmbJHLHJl/bayujS', 'Diana Ramirez', '1032677560', 1, 3, 1, 'CRA 12 A Este #44 B 04 Sur', '3027195267', NULL, NULL, NULL),
(47, 'kevinsabogal24@gmail.com', '$2b$10$uo0mFnJrBWS3v3VJGCFlDueQpKypLV5QkfetzvmZiddkPHiZ5S2aC', 'Pruebas Cliente', '103698541', 1, 3, 1, 'Tv. 12b Bis B #43-58', '3003113203', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `userstatus`
--

DROP TABLE IF EXISTS `userstatus`;
CREATE TABLE IF NOT EXISTS `userstatus` (
  `userStatus_id` int(11) NOT NULL AUTO_INCREMENT,
  `userStatus_name` varchar(20) NOT NULL,
  PRIMARY KEY (`userStatus_id`),
  UNIQUE KEY `userStatus_name` (`userStatus_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `userstatus`
--

TRUNCATE TABLE `userstatus`;
--
-- Volcado de datos para la tabla `userstatus`
--

INSERT INTO `userstatus` (`userStatus_id`, `userStatus_name`) VALUES
(4, 'Account deleted'),
(1, 'Active'),
(2, 'Blocked'),
(3, 'Inactive');

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `barber_schedule`
--
ALTER TABLE `barber_schedule`
  ADD CONSTRAINT `fk_barber_schedule_user` FOREIGN KEY (`barber_id`) REFERENCES `user` (`user_id`);

--
-- Filtros para la tabla `calificaciones`
--
ALTER TABLE `calificaciones`
  ADD CONSTRAINT `fk_calificacion_barbero` FOREIGN KEY (`id_barbero`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_calificacion_cita` FOREIGN KEY (`id_quotes`) REFERENCES `quotes` (`id_quotes`),
  ADD CONSTRAINT `fk_calificacion_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_calificacion_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `services` (`id_services`);

--
-- Filtros para la tabla `calificaciones_cliente`
--
ALTER TABLE `calificaciones_cliente`
  ADD CONSTRAINT `fk_calcli_barbero` FOREIGN KEY (`id_barbero`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_calcli_cita` FOREIGN KEY (`id_quotes`) REFERENCES `quotes` (`id_quotes`),
  ADD CONSTRAINT `fk_calcli_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_calcli_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `services` (`id_services`);

--
-- Filtros para la tabla `consumo_insumo`
--
ALTER TABLE `consumo_insumo`
  ADD CONSTRAINT `fk_consumo_barbero` FOREIGN KEY (`id_barbero`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_consumo_product` FOREIGN KEY (`id_product`) REFERENCES `product` (`id_product`);

--
-- Filtros para la tabla `dotacion`
--
ALTER TABLE `dotacion`
  ADD CONSTRAINT `fk_dotacion_barbero` FOREIGN KEY (`id_barbero`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_dotacion_product` FOREIGN KEY (`id_product`) REFERENCES `product` (`id_product`);

--
-- Filtros para la tabla `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `fk_categoria` FOREIGN KEY (`id_category`) REFERENCES `category_product` (`id_category`),
  ADD CONSTRAINT `fk_product_status` FOREIGN KEY (`id_status`) REFERENCES `product_status` (`id_status`);

--
-- Filtros para la tabla `quotes`
--
ALTER TABLE `quotes`
  ADD CONSTRAINT `fk_appointment_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_barber_user` FOREIGN KEY (`barber_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_quotes_services` FOREIGN KEY (`id_services`) REFERENCES `services` (`id_services`);

--
-- Filtros para la tabla `role_module`
--
ALTER TABLE `role_module`
  ADD CONSTRAINT `role_module_module` FOREIGN KEY (`module_fk`) REFERENCES `module` (`module_id`),
  ADD CONSTRAINT `role_module_role` FOREIGN KEY (`role_fk`) REFERENCES `role` (`role_id`);

--
-- Filtros para la tabla `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `fk_categoria_Servicios` FOREIGN KEY (`id_category_services`) REFERENCES `category_services` (`id_category_services`),
  ADD CONSTRAINT `fk_status` FOREIGN KEY (`id_status`) REFERENCES `service_status` (`id_status`);

--
-- Filtros para la tabla `type_of_quotes`
--
ALTER TABLE `type_of_quotes`
  ADD CONSTRAINT `fk_type_appointment_service` FOREIGN KEY (`id_services`) REFERENCES `services` (`id_services`),
  ADD CONSTRAINT `fk_type_citation_citation` FOREIGN KEY (`id_quotes`) REFERENCES `quotes` (`id_quotes`);

--
-- Filtros para la tabla `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `fk_id_tipo_docuemnto_User` FOREIGN KEY (`type_document_id`) REFERENCES `document_type` (`id_doctypes`),
  ADD CONSTRAINT `user_role` FOREIGN KEY (`role_fk`) REFERENCES `role` (`role_id`),
  ADD CONSTRAINT `user_status` FOREIGN KEY (`userStatus_fk`) REFERENCES `userstatus` (`userStatus_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
