import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { Thermometer, Droplets, Wind, Calendar, Clock, Users, Sun } from 'lucide-react';

// あなたのGAS Web App URL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzbKmO_4sx-0X6JuMeDkRaTu--xAp1RhHXBaz8xgL6qdM81seRB3SF5AUB9NAm4GP4P/exec';

const GymEnvironmentDashboard = () => {
  const [environmentData, setEnvironmentData] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // サンプルデータ生成
  const generateSampleData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 71; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = time.getHours() + time.getMinutes() / 60;
      
      const isReserved = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 18 && hour <= 20);
      const baseTemp = isReserved ? 24 + Math.random() * 4 : 20 + Math.random() * 3;
      const baseHumidity = isReserved ? 55 + Math.random() * 15 : 45 + Math.random() * 10;
      const airconOn = isReserved && (baseTemp > 25 || baseHumidity > 65);
      
      data.push({
        time: time.toLocaleString('ja-JP', { 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: time.getTime(),
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: Math.round(baseHumidity),
        illuminance: Math.round(Math.random() * 200 + 50),
        motion: 1,
        aircon: airconOn ? 30 : null,
        reservation: isReserved ? 10 : null,
        reservationUser: isReserved ? 'サンプル予約' : '',
        airconBar: airconOn ? 5 : 0,
        reservationBar: isReserved ? 5 : 0
      });
    }
    
    return data;
  };

  const getSampleCurrentData = () => {
    return {
      timestamp: new Date().toISOString(),
      temperature: 25.5,
      humidity: 60,
      illuminance: 150,
      motion: 1
    };
  };

  const generateSampleSchedule = () => {
    const schedules = [];
    const now = new Date();
    
    for (let day = 0; day < 3; day++) {
      const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
      
      const daySchedules = [
        { time: '09:00-11:00', user: 'パーソナルトレーニング', status: 'confirmed' },
        { time: '14:00-16:00', user: 'グループレッスン', status: 'confirmed' },
        { time: '18:00-20:00', user: 'サンプル様', status: day === 0 ? 'active' : 'confirmed' }
      ];
      
      schedules.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
        schedules: daySchedules
      });
    }
    
    return schedules;
  };

  // データ取得関数
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Vercel環境でのデータ取得開始:', GAS_WEB_APP_URL);
      
      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache'
      });
      
      console.log('📡 レスポンス:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const textData = await response.text();
      console.log('📄 受信データ (最初の200文字):', textData.substring(0, 200) + '...');
      
      let data;
      try {
        data = JSON.parse(textData);
        console.log('✅ JSON解析成功');
      } catch (parseError) {
        console.error('❌ JSON解析エラー:', parseError);
        throw new Error('データがJSON形式ではありません');
      }
      
      console.log('📊 データ構造確認:', {
        type: typeof data,
        isArray: Array.isArray(data),
        keys: typeof data === 'object' ? Object.keys(data) : []
      });
      
      if (data.error) {
        throw new Error(`GASエラー: ${data.error}`);
      }
      
      // データ処理
      if (data.environmentData && Array.isArray(data.environmentData)) {
        console.log('✅ 標準形式のデータを処理');
        setEnvironmentData(data.environmentData);
        setCurrentData(data.currentStatus || null);
        setScheduleData(generateSampleSchedule());
        setError(null);
      } else if (Array.isArray(data)) {
        console.log('✅ 配列形式のデータを処理');
        const processedData = data.map((item, index) => ({
          time: new Date(Date.now() - (data.length - index) * 5 * 60 * 1000).toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          timestamp: Date.now() - (data.length - index) * 5 * 60 * 1000,
          temperature: parseFloat(item.temperature || item.temp || 25),
          humidity: parseInt(item.humidity || item.hum || 50),
          illuminance: parseInt(item.illuminance || item.light || item.lux || 100),
          motion: parseInt(item.motion || 1),
          aircon: null,
          reservation: null,
          reservationUser: '',
          airconBar: 0,
          reservationBar: 0
        }));
        
        setEnvironmentData(processedData);
        if (processedData.length > 0) {
          const latest = processedData[processedData.length - 1];
          setCurrentData({
            timestamp: latest.timestamp,
            temperature: latest.temperature,
            humidity: latest.humidity,
            illuminance: latest.illuminance,
            motion: latest.motion
          });
        }
        setScheduleData(generateSampleSchedule());
        setError('リアルタイムデータを正常に取得・変換しました');
      } else {
        throw new Error('想定されたデータ構造ではありません');
      }
      
    } catch (err) {
      console.error('❌ データ取得エラー:', err);
      setError(`データ取得エラー: ${err.message}。サンプルデータを表示しています。`);
      
      // サンプルデータで表示
      setEnvironmentData(generateSampleData());
      setCurrentData(getSampleCurrentData());
      setScheduleData(generateSampleSchedule());
      
    } finally {
      setLoading(false);
    }
  };

  // 初期化とタイマー
  useEffect(() => {
    fetchData();
    
    const dataInterval = setInterval(fetchData, 5 * 60 * 1000); // 5分間隔
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1分間隔
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => {
            if (entry.dataKey === 'temperature' || entry.dataKey === 'humidity') {
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {entry.value}{entry.dataKey === 'temperature' ? '°C' : '%'}
                </p>
              );
            }
            return null;
          })}
          {data?.reservationUser && (
            <p className="text-sm text-purple-600">予約: {data.reservationUser}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">データを読み込み中...</p>
          <p className="text-gray-400 text-sm mt-2">Vercel環境で稼働中</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">ジム環境監視</h1>
              <p className="text-gray-600 text-sm">
                {currentTime.toLocaleString('ja-JP', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Powered by</div>
              <div className="text-sm font-bold text-gray-600">Vercel</div>
            </div>
          </div>
        </div>

        {/* エラー/ステータス表示 */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center mb-2">
              <div className="text-yellow-600 text-lg mr-2">⚠️</div>
              <h3 className="text-sm font-medium text-yellow-800">接続状況</h3>
            </div>
            <p className="text-xs text-yellow-700 mb-3">{error}</p>
            <div className="flex gap-2">
              <button 
                onClick={fetchData}
                className="bg-yellow-500 text-white text-xs px-3 py-1 rounded hover:bg-yellow-600 transition-colors"
              >
                再接続
              </button>
              <button 
                onClick={() => window.open(GAS_WEB_APP_URL, '_blank')}
                className="bg-gray-500 text-white text-xs px-3 py-1 rounded hover:bg-gray-600 transition-colors"
              >
                データソース確認
              </button>
            </div>
          </div>
        )}

        {/* データステータス */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-800">システム状況</h3>
            <div className={`flex items-center gap-1`}>
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="text-xs text-gray-500">
                {error ? 'オフライン' : 'オンライン'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <p className="text-gray-500">環境データ</p>
              <p className="font-bold text-gray-800">{environmentData.length}件</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">現在値</p>
              <p className="font-bold text-gray-800">{currentData ? '取得済' : '未取得'}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">予約情報</p>
              <p className="font-bold text-gray-800">{scheduleData.length}日分</p>
            </div>
          </div>
        </div>

        {/* 現在の環境状態 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center mb-2">
              <Thermometer className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">気温</span>
            </div>
            <p className="text-2xl font-bold text-red-500">
              {currentData?.temperature ? currentData.temperature.toFixed(1) : '--'}°C
            </p>
            {currentData?.timestamp && (
              <p className="text-xs text-gray-400 mt-1">
                {new Date(currentData.timestamp).toLocaleTimeString('ja-JP')}
              </p>
            )}
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center mb-2">
              <Droplets className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">湿度</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">
              {currentData?.humidity || '--'}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                style={{width: `${Math.min(currentData?.humidity || 0, 100)}%`}}
              ></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center mb-2">
              <Sun className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">照度</span>
            </div>
            <p className="text-xl font-bold text-yellow-500">
              {currentData?.illuminance || '--'}lux
            </p>
            <p className="text-xs text-gray-500">
              {(currentData?.illuminance || 0) > 100 ? '明るい' : '暗い'}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center mb-2">
              <Wind className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">エアコン</span>
            </div>
            <p className="text-xl font-bold text-gray-400">OFF</p>
            <p className="text-xs text-gray-500">停止中</p>
          </div>
        </div>

        {/* 環境データグラフ */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">環境データ（過去72時間）</h2>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
              <span>気温</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
              <span>湿度</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={environmentData.filter((_, index) => index % 3 === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                fontSize={10}
                interval="preserveStartEnd"
                tick={{ fill: '#666' }}
              />
              <YAxis 
                fontSize={10} 
                tick={{ fill: '#666' }}
                domain={[0, 80]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="気温"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="湿度"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 施設利用スケジュール */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-indigo-500 mr-2" />
            <h2 className="text-lg font-bold text-gray-800">施設利用スケジュール</h2>
          </div>
          
          {scheduleData.map((dayData, dayIndex) => (
            <div key={dayIndex} className="mb-4 last:mb-0">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  {dayData.date} ({dayData.dayOfWeek})
                </span>
                {dayIndex === 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    今日
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {dayData.schedules.map((schedule, scheduleIndex) => (
                  <div 
                    key={scheduleIndex} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      schedule.status === 'active' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium">{schedule.time}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700">{schedule.user}</span>
                      {schedule.status === 'active' && (
                        <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          利用中
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="text-center text-xs text-gray-500 pb-4">
          <div>最終更新: {currentTime.toLocaleTimeString('ja-JP')}</div>
          <div className="mt-1">Deployed on Vercel | データソース: Google Apps Script</div>
        </div>
      </div>
    </div>
  );
};

export default GymEnvironmentDashboard;
