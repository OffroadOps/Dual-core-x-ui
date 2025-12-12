package database

import (
	"fmt"
	"io/fs"
	"os"
	"path"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"x-ui/config"
	"x-ui/database/model"
	"x-ui/util/random"
)

var db *gorm.DB

// InitialCredentials 保存首次安装时生成的随机凭据
type InitialCredentials struct {
	Username string
	Password string
	Port     int
}

var initialCredentials *InitialCredentials

// GetInitialCredentials 获取首次安装时生成的凭据（仅在首次安装时有效）
func GetInitialCredentials() *InitialCredentials {
	return initialCredentials
}

// ClearInitialCredentials 清除初始凭据（安全起见，用户确认后应清除）
func ClearInitialCredentials() {
	initialCredentials = nil
}

func initUser() error {
	err := db.AutoMigrate(&model.User{})
	if err != nil {
		return err
	}
	var count int64
	err = db.Model(&model.User{}).Count(&count).Error
	if err != nil {
		return err
	}
	if count == 0 {
		// 首次安装：生成随机用户名和密码
		username := random.Username(8)
		password := random.Password(16)
		
		user := &model.User{
			Username: username,
			Password: password,
		}
		err = db.Create(user).Error
		if err != nil {
			return err
		}
		
		// 保存初始凭据用于显示给用户
		if initialCredentials == nil {
			initialCredentials = &InitialCredentials{}
		}
		initialCredentials.Username = username
		initialCredentials.Password = password
		
		fmt.Println("================================================")
		fmt.Println("  First Install - Generated Credentials")
		fmt.Println("================================================")
		fmt.Printf("  Username: %s\n", username)
		fmt.Printf("  Password: %s\n", password)
		fmt.Println("================================================")
	}
	return nil
}

func initInbound() error {
	return db.AutoMigrate(&model.Inbound{})
}

func initSetting() error {
	return db.AutoMigrate(&model.Setting{})
}

func InitDB(dbPath string) error {
	dir := path.Dir(dbPath)
	err := os.MkdirAll(dir, fs.ModeDir)
	if err != nil {
		return err
	}

	var gormLogger logger.Interface

	if config.IsDebug() {
		gormLogger = logger.Default
	} else {
		gormLogger = logger.Discard
	}

	c := &gorm.Config{
		Logger: gormLogger,
	}
	db, err = gorm.Open(sqlite.Open(dbPath), c)
	if err != nil {
		return err
	}

	err = initUser()
	if err != nil {
		return err
	}
	err = initInbound()
	if err != nil {
		return err
	}
	err = initSetting()
	if err != nil {
		return err
	}

	return nil
}

func GetDB() *gorm.DB {
	return db
}

func IsNotFound(err error) bool {
	return err == gorm.ErrRecordNotFound
}
